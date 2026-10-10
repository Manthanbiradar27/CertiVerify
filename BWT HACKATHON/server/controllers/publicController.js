'use strict';
const { Certificate } = require('../models/Certificate');
const { log, AUDIT_ACTIONS } = require('../services/auditService');

const getIp = (req) => req.ip || null;

/**
 * GET /api/public/verify/:publicId
 *
 * Public endpoint — no authentication required.
 * Returns ONLY the information needed to establish certificate authenticity.
 * Never exposes: internal _ids, organization credentials, student PII beyond name,
 * or internal audit data.
 *
 * Status precedence (server-computed, never trusted from client):
 *   1. NOT_FOUND  — no matching publicId
 *   2. REVOKED    — isRevoked === true  (wins over expiry)
 *   3. EXPIRED    — expiryDate is set and < now
 *   4. VALID      — all other cases
 */
exports.verifyCertificate = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    // Input guard: publicIds are alphanumeric, 12 chars
    if (!/^[A-Za-z0-9]{8,20}$/.test(publicId)) {
      return res.status(200).json({
        success: true,
        result: {
          status: 'NOT_FOUND',
          message: 'No certificate found with that ID.',
        },
      });
    }

    const cert = await Certificate.findOne({ publicId })
      .populate('recipient', 'name') // only name — minimal PII
      .populate('organization', 'name'); // only org name

    // Append-only audit of all verification attempts (even failures)
    // We do not reveal this data to the caller
    await log({
      actor: null,
      action: AUDIT_ACTIONS.CERT_VERIFIED,
      targetType: 'Certificate',
      targetId: publicId,
      meta: { found: !!cert },
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
    });

    if (!cert) {
      return res.status(200).json({
        success: true,
        result: {
          status: 'NOT_FOUND',
          message: 'No certificate found with that ID.',
        },
      });
    }

    // Compute status server-side — never accept from client
    let status;
    let statusMessage;
    if (cert.isRevoked) {
      status = 'REVOKED';
      statusMessage = 'This certificate has been revoked and is no longer valid.';
    } else if (cert.expiryDate && new Date() > cert.expiryDate) {
      status = 'EXPIRED';
      statusMessage = 'This certificate has expired.';
    } else {
      status = 'VALID';
      statusMessage = 'This certificate is authentic and currently valid.';
    }

    return res.status(200).json({
      success: true,
      result: {
        status,
        message: statusMessage,
        // Minimal public fields only
        certificateId: cert.publicId,
        recipientName: cert.recipient?.name || 'Unknown',
        issuingOrganization: cert.organization?.name || 'Unknown',
        title: cert.title,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate || null,
        revokedAt: cert.isRevoked ? cert.revokedAt : null,
        revocationReason: cert.isRevoked ? (cert.revocationReason || null) : null,
      },
    });
  } catch (err) {
    next(err);
  }
};
