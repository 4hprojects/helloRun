// src/services/qr-code.service.js
// QR code generation for bib scanning

const QRCode = require('qrcode');

/**
 * Generate QR code for bib scanning
 * Encodes: eventId + bibNumber + checksum
 * Format: "EVENT:{eventId}|BIB:{bibNumber}|TIME:{timestamp}"
 */
async function generateBibQRCode(eventId, bibNumber, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const qrData = `EVENT:${eventId}|BIB:${bibNumber}|TIME:${timestamp}`;

  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: options.width || 300,
      margin: options.margin || 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      data_url: qrDataUrl,
      encoded_data: qrData,
      format: 'data:image/png;base64',
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generate QR code as buffer (for file save)
 */
async function generateBibQRCodeBuffer(eventId, bibNumber, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const qrData = `EVENT:${eventId}|BIB:${bibNumber}|TIME:${timestamp}`;

  try {
    const buffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: options.width || 300,
      margin: options.margin || 1
    });

    return {
      success: true,
      buffer,
      encoded_data: qrData,
      mime_type: 'image/png',
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code buffer: ${error.message}`);
  }
}

/**
 * Generate QR code as SVG
 */
async function generateBibQRCodeSVG(eventId, bibNumber, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const qrData = `EVENT:${eventId}|BIB:${bibNumber}|TIME:${timestamp}`;

  try {
    const svgString = await QRCode.toString(qrData, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      width: options.width || 300,
      margin: options.margin || 1
    });

    return {
      success: true,
      svg: svgString,
      encoded_data: qrData,
      mime_type: 'image/svg+xml',
      timestamp
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error.message}`);
  }
}

/**
 * Decode and validate QR code data
 */
function decodeQRData(qrData) {
  try {
    const parts = qrData.split('|');
    const decoded = {};

    for (const part of parts) {
      const [key, value] = part.split(':');
      decoded[key] = value;
    }

    return {
      success: true,
      eventId: decoded.EVENT,
      bibNumber: decoded.BIB,
      timestamp: parseInt(decoded.TIME),
      raw: decoded
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid QR data format: ${error.message}`
    };
  }
}

/**
 * Generate batch QR codes for all bibs in event
 */
async function generateBatchQRCodes(eventId, bibAssignments) {
  const results = [];

  for (const assignment of bibAssignments) {
    try {
      const qr = await generateBibQRCode(eventId, assignment.bib_number);
      results.push({
        bib_number: assignment.bib_number,
        success: true,
        qr_data_url: qr.data_url
      });
    } catch (error) {
      results.push({
        bib_number: assignment.bib_number,
        success: false,
        error: error.message
      });
    }
  }

  return {
    total: bibAssignments.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

module.exports = {
  generateBibQRCode,
  generateBibQRCodeBuffer,
  generateBibQRCodeSVG,
  decodeQRData,
  generateBatchQRCodes
};
