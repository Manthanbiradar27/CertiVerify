'use strict';
const { User } = require('../models/User');

const ALLOWED_UPDATE = ['name', 'description', 'website', 'contactPhone', 'address'];

// ── GET /api/org/profile ────────────────────────────────────────────────────
exports.getProfile = (req, res) => {
  return res.status(200).json({ success: true, organization: req.user.toPublicProfile() });
};

// ── PATCH /api/org/profile ──────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const update = {};
    ALLOWED_UPDATE.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    return res.status(200).json({ success: true, organization: user.toPublicProfile() });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/org/dashboard ──────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { Certificate } = require('../models/Certificate');
    const Recipient = require('../models/Recipient');

    const orgId = req.user._id;
    const [totalCerts, revokedCerts, totalRecipients, recentCerts] = await Promise.all([
      Certificate.countDocuments({ organization: orgId }),
      Certificate.countDocuments({ organization: orgId, isRevoked: true }),
      Recipient.countDocuments({ organization: orgId }),
      Certificate.find({ organization: orgId })
        .populate('recipient', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalCertificates: totalCerts,
        revokedCertificates: revokedCerts,
        validCertificates: totalCerts - revokedCerts,
        totalRecipients,
      },
      recentCertificates: recentCerts,
    });
  } catch (err) {
    next(err);
  }
};
