const express = require('express');
const urlController = require('../controllers/urlController');

const router = express.Router();

// Create shortened URL
router.post('/shorten', urlController.createShortUrl);

// Get URL statistics
router.get('/stats/:shortcode', urlController.getUrlStats);

// Delete shortened URL
router.delete('/:shortcode', urlController.deleteShortUrl);

// Redirect to original URL (must be last to avoid conflicts)
router.get('/:shortcode', urlController.redirectToOriginal);

module.exports = router;