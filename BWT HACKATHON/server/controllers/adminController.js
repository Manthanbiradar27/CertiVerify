'use strict';
const { User, STATUSES } = require('../models/User');
const { Certificate } = require('../models/Certificate');
const Recipient = require('../models/Recipient');
const { AuditLog } = require('../models/AuditLog');
const { log, AUDIT_ACTIONS } = require('../services/auditService');

const getIp = (req) => req.ip || null;

// ── GET /api/admin/stats ────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [totalOrgs, activeOrgs, suspendedOrgs, totalCerts, revokedCerts, totalRecipients] =
      await Promise.all([
        User.countDocuments({ role: 'organization' }),
        User.countDocuments({ role: 'organization', status: 'active' }),
        User.countDocuments({ role: 'organization', status: 'suspended' }),
        Certificate.countDocuments(),
        Certificate.countDocuments({ isRevoked: true }),
        Recipient.countDocuments(),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalOrgs, activeOrgs, suspendedOrgs,
        totalCerts, revokedCerts,
        validCerts: totalCerts - revokedCerts,
        totalRecipients,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/organizations ────────────────────────────────────────────
exports.listOrganizations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: 'organization' };
    if (req.query.status && Object.values(STATUSES).includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const [orgs, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      organizations: orgs.map((o) => o.toPublicProfile()),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/organizations/:id ───────────────────────────────────────
exports.getOrganization = async (req, res, next) => {
  try {
    const org = await User.findOne({ _id: req.params.id, role: 'organization' });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const [certCount, recipientCount] = await Promise.all([
      Certificate.countDocuments({ organization: org._id }),
      Recipient.countDocuments({ organization: org._id }),
    ]);

    return res.status(200).json({
      success: true,
      organization: { ...org.toPublicProfile(), certCount, recipientCount },
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID.' });
    next(err);
  }
};

// ── PATCH /api/admin/organizations/:id/status ──────────────────────────────
exports.setOrgStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.values(STATUSES).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const org = await User.findOne({ _id: req.params.id, role: 'organization' });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    org.status = status;
    await org.save({ validateBeforeSave: false });

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.ORG_STATUS_CHANGE,
      targetType: 'User', targetId: org._id,
      meta: { newStatus: status, orgName: org.name },
      ip: getIp(req),
    });

    return res.status(200).json({ success: true, message: `Organization ${status}.`, organization: org.toPublicProfile() });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID.' });
    next(err);
  }
};

// ── GET /api/admin/audit-logs ───────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/certificates ─────────────────────────────────────────────
exports.listAllCertificates = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.orgId) filter.organization = req.query.orgId;
    if (req.query.isRevoked === 'true') filter.isRevoked = true;
    if (req.query.isRevoked === 'false') filter.isRevoked = false;

    const [certs, total] = await Promise.all([
      Certificate.find(filter)
        .populate('recipient', 'name')
        .populate('organization', 'name email')
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

// ── GET /api/admin/organizations/:id/profile ────────────────────────────────
exports.updateOrgProfile = async (req, res, next) => {
  try {
    const ALLOWED = ['name', 'status'];
    const update = {};
    ALLOWED.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const org = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'organization' },
      update,
      { new: true, runValidators: true }
    );
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    return res.status(200).json({ success: true, organization: org.toPublicProfile() });
  } catch (err) {
    next(err);
  }
};
