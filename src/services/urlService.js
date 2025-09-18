const crypto = require('crypto');
const { logger } = require('../middleware/logger');

class UrlService {
    constructor() {
        this.urls = new Map();
        this.customCodes = new Set();
    }

    generateShortcode(length = 6) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const maxAttempts = 1000;
        let shortcode;

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            shortcode = '';
            for (let i = 0; i < length; i++) {
                shortcode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            if (!this.urls.has(shortcode) && !this.customCodes.has(shortcode)) {
                return shortcode;
            }

            if (attempts > 0 && attempts % 100 === 0) {
                length++;
            }
        }

        throw new Error('Unable to generate unique shortcode');
    }

    validateShortcode(shortcode) {
        if (!shortcode || typeof shortcode !== 'string') {
            return { valid: false, message: 'Shortcode must be a non-empty string' };
        }

        if (shortcode.length < 3 || shortcode.length > 20) {
            return { valid: false, message: 'Shortcode must be between 3-20 characters' };
        }

        if (!/^[a-zA-Z0-9]+$/.test(shortcode)) {
            return { valid: false, message: 'Shortcode must contain only alphanumeric characters' };
        }

        return { valid: true };
    }

    createShortUrl(originalUrl, customShortcode = null, validityMinutes = 30, requestId) {
        logger.info('Creating short URL', {
            requestId,
            originalUrl,
            customShortcode,
            validityMinutes
        });

        try {
            new URL(originalUrl);
        } catch (error) {
            logger.warn('Invalid URL provided', {
                requestId,
                originalUrl,
                error: error.message
            });
            throw new Error('Invalid URL format');
        }

        let shortcode;

        if (customShortcode) {
            const validation = this.validateShortcode(customShortcode);
            if (!validation.valid) {
                logger.warn('Invalid custom shortcode', {
                    requestId,
                    customShortcode,
                    error: validation.message
                });
                throw new Error(validation.message);
            }

            if (this.urls.has(customShortcode)) {
                logger.warn('Shortcode already exists', {
                    requestId,
                    customShortcode
                });
                throw new Error('Shortcode already exists');
            }

            shortcode = customShortcode;
            this.customCodes.add(shortcode);
        } else {
            try {
                shortcode = this.generateShortcode();
                if (!shortcode || shortcode.length === 0) {
                    throw new Error('Failed to generate shortcode');
                }
            } catch (error) {
                logger.error('Shortcode generation failed', {
                    requestId,
                    error: error.message
                });
                throw new Error('Unable to generate unique shortcode');
            }
        }

        if (!shortcode || typeof shortcode !== 'string' || shortcode.length < 3) {
            logger.error('Invalid shortcode generated', {
                requestId,
                shortcode
            });
            throw new Error('Invalid shortcode generated');
        }

        const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);
        const urlData = {
            originalUrl,
            shortcode,
            createdAt: new Date(),
            expiresAt,
            accessCount: 0,
            isCustom: !!customShortcode
        };

        this.urls.set(shortcode, urlData);

        logger.info('Short URL created successfully', {
            requestId,
            shortcode,
            originalUrl,
            expiresAt: expiresAt.toISOString()
        });

        return {
            shortcode,
            shortUrl: `/${shortcode}`,
            originalUrl,
            expiresAt,
            validityMinutes
        };
    }

    getOriginalUrl(shortcode, requestId) {
        logger.info('Retrieving original URL', {
            requestId,
            shortcode
        });

        const urlData = this.urls.get(shortcode);

        if (!urlData) {
            logger.warn('Shortcode not found', {
                requestId,
                shortcode
            });
            throw new Error('Shortcode not found');
        }


        if (new Date() > urlData.expiresAt) {
            logger.warn('Shortcode expired', {
                requestId,
                shortcode,
                expiresAt: urlData.expiresAt.toISOString()
            });

            this.urls.delete(shortcode);
            if (urlData.isCustom) {
                this.customCodes.delete(shortcode);
            }

            throw new Error('Shortened URL has expired');
        }


        urlData.accessCount++;

        logger.info('Original URL retrieved successfully', {
            requestId,
            shortcode,
            originalUrl: urlData.originalUrl,
            accessCount: urlData.accessCount
        });

        return urlData;
    }

    getUrlStats(shortcode, requestId) {
        logger.info('Retrieving URL statistics', {
            requestId,
            shortcode
        });

        const urlData = this.urls.get(shortcode);

        if (!urlData) {
            logger.warn('Shortcode not found for stats', {
                requestId,
                shortcode
            });
            throw new Error('Shortcode not found');
        }

        const isExpired = new Date() > urlData.expiresAt;

        return {
            shortcode,
            originalUrl: urlData.originalUrl,
            createdAt: urlData.createdAt,
            expiresAt: urlData.expiresAt,
            accessCount: urlData.accessCount,
            isExpired,
            isCustom: urlData.isCustom
        };
    }


    deleteShortUrl(shortcode, requestId) {
        logger.info('Deleting short URL', {
            requestId,
            shortcode
        });

        const urlData = this.urls.get(shortcode);

        if (!urlData) {
            logger.warn('Shortcode not found for deletion', {
                requestId,
                shortcode
            });
            throw new Error('Shortcode not found');
        }

        this.urls.delete(shortcode);
        if (urlData.isCustom) {
            this.customCodes.delete(shortcode);
        }

        logger.info('Short URL deleted successfully', {
            requestId,
            shortcode
        });

        return true;
    }


    cleanupExpiredUrls() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [shortcode, urlData] of this.urls.entries()) {
            if (now > urlData.expiresAt) {
                this.urls.delete(shortcode);
                if (urlData.isCustom) {
                    this.customCodes.delete(shortcode);
                }
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info('Cleaned up expired URLs', {
                cleanedCount,
                timestamp: now.toISOString()
            });
        }

        return cleanedCount;
    }
}

module.exports = new UrlService();
