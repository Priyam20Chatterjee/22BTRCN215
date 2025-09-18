const urlService = require('../services/urlService');
const { logger } = require('../middleware/logger');
const validator = require('validator');

class UrlController {

  async createShortUrl(req, res) {
    try {
      const { url, shortcode, validity } = req.body;
      const requestId = req.requestId;


      if (!url) {
        logger.warn('Missing URL in request', { requestId });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'URL is required',
          code: 'MISSING_URL'
        });
      }


      if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
        logger.warn('Invalid URL format', { requestId, url });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid URL format. Must be a valid HTTP/HTTPS URL',
          code: 'INVALID_URL'
        });
      }


      let validityMinutes = 30;
      if (validity !== undefined) {
        if (!Number.isInteger(validity) || validity < 1) {
          logger.warn('Invalid validity period', { requestId, validity });
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Validity must be a positive integer representing minutes',
            code: 'INVALID_VALIDITY'
          });
        }
        validityMinutes = validity;
      }

      const result = urlService.createShortUrl(url, shortcode, validityMinutes, requestId);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error creating short URL', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Conflict',
          message: error.message,
          code: 'SHORTCODE_EXISTS'
        });
      }

      if (error.message.includes('Invalid') || error.message.includes('must be')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          code: 'VALIDATION_ERROR'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create shortened URL',
        code: 'CREATE_ERROR'
      });
    }
  }


  async redirectToOriginal(req, res) {
    try {
      const { shortcode } = req.params;
      const requestId = req.requestId;

      if (!shortcode) {
        logger.warn('Missing shortcode in redirect request', { requestId });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Shortcode is required',
          code: 'MISSING_SHORTCODE'
        });
      }

      const urlData = urlService.getOriginalUrl(shortcode, requestId);

      logger.info('Redirecting to original URL', {
        requestId,
        shortcode,
        originalUrl: urlData.originalUrl
      });

      res.redirect(302, urlData.originalUrl);

    } catch (error) {
      logger.error('Error during redirection', {
        requestId: req.requestId,
        shortcode: req.params.shortcode,
        error: error.message
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Shortened URL not found',
          code: 'SHORTCODE_NOT_FOUND'
        });
      }

      if (error.message.includes('expired')) {
        return res.status(410).json({
          error: 'Gone',
          message: 'Shortened URL has expired',
          code: 'SHORTCODE_EXPIRED'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process redirect',
        code: 'REDIRECT_ERROR'
      });
    }
  }


  async getUrlStats(req, res) {
    try {
      const { shortcode } = req.params;
      const requestId = req.requestId;

      if (!shortcode) {
        logger.warn('Missing shortcode in stats request', { requestId });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Shortcode is required',
          code: 'MISSING_SHORTCODE'
        });
      }

      const stats = urlService.getUrlStats(shortcode, requestId);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error retrieving URL stats', {
        requestId: req.requestId,
        shortcode: req.params.shortcode,
        error: error.message
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Shortened URL not found',
          code: 'SHORTCODE_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve URL statistics',
        code: 'STATS_ERROR'
      });
    }
  }


  async deleteShortUrl(req, res) {
    try {
      const { shortcode } = req.params;
      const requestId = req.requestId;

      if (!shortcode) {
        logger.warn('Missing shortcode in delete request', { requestId });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Shortcode is required',
          code: 'MISSING_SHORTCODE'
        });
      }

      urlService.deleteShortUrl(shortcode, requestId);

      res.status(200).json({
        success: true,
        message: 'Shortened URL deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting short URL', {
        requestId: req.requestId,
        shortcode: req.params.shortcode,
        error: error.message
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Shortened URL not found',
          code: 'SHORTCODE_NOT_FOUND'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete shortened URL',
        code: 'DELETE_ERROR'
      });
    }
  }
}

module.exports = new UrlController();