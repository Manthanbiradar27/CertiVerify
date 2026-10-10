'use strict';
const { customAlphabet } = require('nanoid');
const qrcode = require('qrcode');
const PDFDocument = require('pdfkit');

// Alphanumeric (upper+lower+digits), no look-alike chars
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const generateId = customAlphabet(alphabet, 12);

/**
 * Generate a unique public certificate ID.
 * Collision handling is done by the caller (retry on duplicate key error).
 */
const generatePublicId = () => generateId();

/**
 * Generate QR code as a base64 data URL.
 * The QR code encodes only the public verification URL — no credentials.
 *
 * @param {string} publicId
 * @returns {Promise<string>} data URL
 */
const generateQRCode = async (publicId) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify/${publicId}`;

  return qrcode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 200,
  });
};

/**
 * Generate a PDF certificate as a Buffer.
 *
 * @param {object} opts
 * @param {string} opts.recipientName
 * @param {string} opts.orgName
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {Date|string} opts.issueDate
 * @param {Date|string|null} opts.expiryDate
 * @param {string} opts.publicId
 * @param {string} opts.qrDataUrl - QR code as data URL
 * @param {string} opts.status
 * @returns {Promise<Buffer>}
 */
const generateCertificatePDF = (opts) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 841.89; // A4 landscape width in pts
    const H = 595.28; // A4 landscape height in pts

    // ── Background ──────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#0f0e17');

    // ── Decorative border ────────────────────────────────────────────────
    doc
      .rect(20, 20, W - 40, H - 40)
      .lineWidth(2)
      .stroke('#4f46e5');

    doc
      .rect(28, 28, W - 56, H - 56)
      .lineWidth(0.5)
      .stroke('#6d6af0');

    // ── Header band ──────────────────────────────────────────────────────
    doc.rect(20, 20, W - 40, 70).fill('#4f46e5');

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('CERTIVERIFY', 40, 35, { align: 'center', width: W - 80 });

    doc
      .fillColor('#c7d2fe')
      .font('Helvetica')
      .fontSize(10)
      .text('SECURE DIGITAL CERTIFICATE', 40, 62, { align: 'center', width: W - 80 });

    // ── Revoked watermark ────────────────────────────────────────────────
    if (opts.status === 'REVOKED') {
      doc.save();
      doc.opacity(0.15);
      doc
        .fillColor('#ef4444')
        .font('Helvetica-Bold')
        .fontSize(120)
        .rotate(-35, { origin: [W / 2, H / 2] })
        .text('REVOKED', 0, H / 2 - 80, { align: 'center', width: W });
      doc.restore();
    }

    // ── Certificate body ─────────────────────────────────────────────────
    const bodyTop = 110;
    const leftCol = 60;
    const rightColStart = W - 220;

    // "This is to certify that"
    doc
      .fillColor('#a5b4fc')
      .font('Helvetica')
      .fontSize(12)
      .text('This is to certify that', leftCol, bodyTop, { width: rightColStart - leftCol - 20 });

    // Recipient name
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(28)
      .text(opts.recipientName, leftCol, bodyTop + 22, { width: rightColStart - leftCol - 20 });

    // "has successfully completed"
    doc
      .fillColor('#a5b4fc')
      .font('Helvetica')
      .fontSize(12)
      .text('has successfully completed', leftCol, bodyTop + 62);

    // Certificate title
    doc
      .fillColor('#e0e7ff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(opts.title, leftCol, bodyTop + 80, { width: rightColStart - leftCol - 20 });

    // Description
    if (opts.description) {
      doc
        .fillColor('#a5b4fc')
        .font('Helvetica')
        .fontSize(11)
        .text(opts.description, leftCol, bodyTop + 116, {
          width: rightColStart - leftCol - 20,
          height: 60,
          ellipsis: true,
        });
    }

    // Issued by
    doc
      .fillColor('#818cf8')
      .font('Helvetica')
      .fontSize(11)
      .text('Issued by', leftCol, bodyTop + 190);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(opts.orgName, leftCol, bodyTop + 206, { width: rightColStart - leftCol - 20 });

    // Dates
    const issueDateStr = new Date(opts.issueDate).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    doc
      .fillColor('#818cf8')
      .font('Helvetica')
      .fontSize(10)
      .text(`Issue Date: ${issueDateStr}`, leftCol, bodyTop + 240);

    if (opts.expiryDate) {
      const expiryDateStr = new Date(opts.expiryDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      doc.text(`Valid Until: ${expiryDateStr}`, leftCol, bodyTop + 256);
    } else {
      doc.text('Valid Until: No Expiry', leftCol, bodyTop + 256);
    }

    // Certificate ID
    doc
      .fillColor('#6d6af0')
      .font('Helvetica')
      .fontSize(9)
      .text(`Certificate ID: ${opts.publicId}`, leftCol, H - 60, { width: rightColStart - leftCol });

    // ── QR Code ──────────────────────────────────────────────────────────
    if (opts.qrDataUrl) {
      // Convert data URL to buffer
      const base64Data = opts.qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');

      const qrSize = 150;
      const qrX = rightColStart + 20;
      const qrY = bodyTop;

      // White background behind QR
      doc.rect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16).fill('#ffffff');
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc
        .fillColor('#a5b4fc')
        .font('Helvetica')
        .fontSize(8)
        .text('Scan to verify', qrX - 8, qrY + qrSize + 10, { width: qrSize + 16, align: 'center' });
    }

    // ── Divider line ─────────────────────────────────────────────────────
    doc
      .moveTo(leftCol, H - 75)
      .lineTo(rightColStart - 20, H - 75)
      .lineWidth(0.5)
      .stroke('#4f46e5');

    // ── Verify URL footer ────────────────────────────────────────────────
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    doc
      .fillColor('#6d6af0')
      .font('Helvetica')
      .fontSize(8)
      .text(`Verify at: ${clientUrl}/verify/${opts.publicId}`, leftCol, H - 45, {
        width: rightColStart - leftCol,
      });

    doc.end();
  });
};

module.exports = { generatePublicId, generateQRCode, generateCertificatePDF };
