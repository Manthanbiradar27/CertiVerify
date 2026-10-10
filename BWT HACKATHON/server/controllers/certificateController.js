'use strict';
const mongoose = require('mongoose');
const { Certificate, CERT_STATUSES } = require('../models/Certificate');
const Recipient = require('../models/Recipient');
const { generatePublicId, generateQRCode, generateCertificatePDF } = require('../services/certificateService');
const { log, AUDIT_ACTIONS } = require('../services/auditService');

const getIp = (req) => req.ip || null;

const ALLOWED_ISSUE = ['recipientId', 'title', 'description', 'issueDate', 'expiryDate'];

// ── POST /api/certificates ──────────────────────────────────────────────────
exports.issueCertificate = async (req, res, next) => {
  try {
    const { recipientId, title, description, issueDate, expiryDate } = req.body;

    // Verify recipient belongs to this org
    const recipient = await Recipient.findOne({
      _id: recipientId,
      organization: req.user._id,
    });
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    // Generate unique publicId with collision retry
    let publicId;
    let attempts = 0;
    while (attempts < 5) {
      publicId = generatePublicId();
      const existing = await Certificate.findOne({ publicId });
      if (!existing) break;
      attempts++;
    }
    if (!publicId) {
      return next(new Error('Failed to generate unique certificate ID. Please try again.'));
    }

    const certData = {
      publicId,
      recipient: recipient._id,
      organization: req.user._id,
      title,
      issueDate: new Date(issueDate),
    };
    if (description) certData.description = description;
    if (expiryDate) certData.expiryDate = new Date(expiryDate);

    const certificate = await Certificate.create(certData);

    // Generate QR code
    const qrDataUrl = await generateQRCode(publicId);

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.CERT_ISSUED,
      targetType: 'Certificate', targetId: publicId,
      meta: { title, recipientName: recipient.name },
      ip: getIp(req),
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully.',
      certificate: { ...certificate.toJSON(), qrCode: qrDataUrl },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new Error('Certificate ID conflict. Please retry.'));
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID.' });
    }
    next(err);
  }
};

// ── GET /api/certificates ───────────────────────────────────────────────────
exports.listCertificates = async (req, res, next) => {
  try {
    const orgId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { organization: orgId };

    if (req.query.status === 'REVOKED') filter.isRevoked = true;
    else if (req.query.status === 'VALID') filter.isRevoked = false;

    if (req.query.search) {
      const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safe, $options: 'i' };
    }

    const [certs, total] = await Promise.all([
      Certificate.find(filter)
        .populate('recipient', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Certificate.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      certificates: certs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/certificates/:id ───────────────────────────────────────────────
exports.getCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({
      _id: req.params.id,
      organization: req.user._id,
    }).populate('recipient', 'name email').populate('revokedBy', 'name email');

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    // Generate fresh QR code
    const qrCode = await generateQRCode(cert.publicId);

    return res.status(200).json({ success: true, certificate: { ...cert.toJSON(), qrCode } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID.' });
    }
    next(err);
  }
};

// ── PATCH /api/certificates/:id/revoke ─────────────────────────────────────
exports.revokeCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({
      _id: req.params.id,
      organization: req.user._id,
    });

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    if (cert.isRevoked) {
      return res.status(409).json({ success: false, message: 'Certificate is already revoked.' });
    }

    cert.isRevoked = true;
    cert.revokedAt = new Date();
    cert.revokedBy = req.user._id;
    cert.revocationReason = req.body.reason || null;
    await cert.save();

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.CERT_REVOKED,
      targetType: 'Certificate', targetId: cert.publicId,
      meta: { reason: cert.revocationReason, title: cert.title },
      ip: getIp(req),
    });

    return res.status(200).json({ success: true, message: 'Certificate revoked.', certificate: cert });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID.' });
    }
    next(err);
  }
};

// ── GET /api/certificates/:id/download ─────────────────────────────────────
exports.downloadCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({
      _id: req.params.id,
      organization: req.user._id,
    }).populate('recipient', 'name').populate('organization', 'name');

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const qrDataUrl = await generateQRCode(cert.publicId);

    const pdfBuffer = await generateCertificatePDF({
      recipientName: cert.recipient.name,
      orgName: req.user.name,
      title: cert.title,
      description: cert.description,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      publicId: cert.publicId,
      qrDataUrl,
      status: cert.status,
    });

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.CERT_DOWNLOADED,
      targetType: 'Certificate', targetId: cert.publicId,
      ip: getIp(req),
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${cert.publicId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID.' });
    }
    next(err);
  }
};

// ── GET /api/certificates/:id/qr ───────────────────────────────────────────
exports.getCertificateQR = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ _id: req.params.id, organization: req.user._id });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const qrCode = await generateQRCode(cert.publicId);
    return res.status(200).json({ success: true, qrCode, publicId: cert.publicId });
  } catch (err) {
    next(err);
  }
};
