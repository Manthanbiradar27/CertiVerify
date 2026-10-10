'use strict';
const Recipient = require('../models/Recipient');
const { Certificate } = require('../models/Certificate');
const { log, AUDIT_ACTIONS } = require('../services/auditService');

const getIp = (req) => req.ip || null;

// Allowlisted fields an org may set/update
const ALLOWED_CREATE = ['name', 'email', 'notes'];
const ALLOWED_UPDATE = ['name', 'email', 'notes'];

// ── POST /api/recipients ────────────────────────────────────────────────────
exports.createRecipient = async (req, res, next) => {
  try {
    const data = {};
    ALLOWED_CREATE.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    data.organization = req.user._id; // server-derived — never from client

    const recipient = await Recipient.create(data);

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.RECIPIENT_CREATED,
      targetType: 'Recipient', targetId: recipient._id,
      meta: { name: recipient.name },
      ip: getIp(req),
    });

    return res.status(201).json({ success: true, recipient });
  } catch (err) {
    // Duplicate email within same org
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A recipient with that email already exists in your organization.' });
    }
    next(err);
  }
};

// ── GET /api/recipients ─────────────────────────────────────────────────────
exports.listRecipients = async (req, res, next) => {
  try {
    const orgId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { organization: orgId };
    if (req.query.search) {
      const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const [recipients, total] = await Promise.all([
      Recipient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Recipient.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      recipients,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/recipients/:id ─────────────────────────────────────────────────
exports.getRecipient = async (req, res, next) => {
  try {
    const recipient = await Recipient.findOne({
      _id: req.params.id,
      organization: req.user._id, // ownership enforced
    });

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    return res.status(200).json({ success: true, recipient });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID.' });
    }
    next(err);
  }
};

// ── PATCH /api/recipients/:id ───────────────────────────────────────────────
exports.updateRecipient = async (req, res, next) => {
  try {
    const update = {};
    ALLOWED_UPDATE.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    const recipient = await Recipient.findOneAndUpdate(
      { _id: req.params.id, organization: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.RECIPIENT_UPDATED,
      targetType: 'Recipient', targetId: recipient._id,
      meta: { updatedFields: Object.keys(update) },
      ip: getIp(req),
    });

    return res.status(200).json({ success: true, recipient });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A recipient with that email already exists.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID.' });
    }
    next(err);
  }
};

// ── DELETE /api/recipients/:id ──────────────────────────────────────────────
exports.deleteRecipient = async (req, res, next) => {
  try {
    // Check if recipient has any certificates
    const certCount = await Certificate.countDocuments({ recipient: req.params.id, organization: req.user._id });
    if (certCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: recipient has ${certCount} certificate(s) on record.`,
      });
    }

    const recipient = await Recipient.findOneAndDelete({
      _id: req.params.id,
      organization: req.user._id,
    });

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    await log({
      actor: req.user._id, actorEmail: req.user.email,
      action: AUDIT_ACTIONS.RECIPIENT_DELETED,
      targetType: 'Recipient', targetId: req.params.id,
      meta: { name: recipient.name },
      ip: getIp(req),
    });

    return res.status(200).json({ success: true, message: 'Recipient deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID.' });
    }
    next(err);
  }
};
