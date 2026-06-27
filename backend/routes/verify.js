const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');

// GET /api/verify/:certificateId
// PUBLIC - No authentication required
// Anyone can verify a certificate by its ID
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!certificateId || certificateId.trim().length === 0) {
      return res.status(400).json({ 
        found: false, 
        error: 'Certificate ID is required',
        message: 'Please provide a certificate ID to verify.'
      });
    }

    // Search for the certificate in the database
    const certificate = await Certificate.findOne({ 
      certificateId: certificateId.trim() 
    });

    // If certificate not found
    if (!certificate) {
      return res.status(404).json({ 
        found: false,
        message: 'Certificate not found in our system.',
        searchedId: certificateId.trim()
      });
    }

    // Check if certificate is expired
    let isExpired = false;
    if (certificate.expiryDate) {
      const now = new Date();
      const expiryDate = new Date(certificate.expiryDate);
      // Set both to start of day for accurate comparison
      now.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      isExpired = expiryDate < now;
    }

    // Check if certificate is revoked
    const isRevoked = certificate.status === 'revoked';

    // If revoked, treat as not found
    if (isRevoked) {
      return res.status(404).json({
        found: false,
        message: 'This certificate has been revoked.',
        searchedId: certificateId.trim()
      });
    }

    // Certificate found - return all details
    return res.status(200).json({
      found: true,
      studentName: certificate.studentName || certificate.userName || 'Student',
      courseName: certificate.courseName || 'Certification',
      issueDate: certificate.issueDate || certificate.issuedAt || certificate.createdAt,
      expiryDate: certificate.expiryDate || null,
      score: certificate.score || certificate.examScore || null,
      certificateId: certificate.certificateId,
      isExpired: isExpired,
      status: isExpired ? 'expired' : 'active',
      issuedBy: 'obliXel Academy',
      message: isExpired 
        ? 'Certificate has expired. The holder needs to renew.' 
        : 'Certificate is valid and authentic.'
    });

  } catch (error) {
    console.error('❌ Verify error:', error);
    return res.status(500).json({ 
      found: false,
      error: 'Verification failed',
      message: 'An error occurred while verifying the certificate. Please try again later.'
    });
  }
});

module.exports = router;
