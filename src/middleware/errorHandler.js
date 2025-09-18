const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';

    logger.error('Unhandled error', {
        requestId,
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });


    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
        message: statusCode >= 500 ? 'An unexpected error occurred' : message,
        code: 'UNHANDLED_ERROR',
        requestId
    });
};


const notFoundHandler = (req, res) => {
    const requestId = req.requestId || 'unknown';

    logger.warn('Route not found', {
        requestId,
        url: req.url,
        method: req.method
    });

    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        code: 'ROUTE_NOT_FOUND',
        requestId
    });
};

module.exports = { errorHandler, notFoundHandler };