const winston = require('winston');


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'url-shortener' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});


const loggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = require('crypto').randomUUID();


    req.requestId = requestId;


    logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
    });


    const originalJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - startTime;

        logger.info('Outgoing response', {
            requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            responseSize: JSON.stringify(data).length,
            timestamp: new Date().toISOString()
        });

        return originalJson.call(this, data);
    };

    next();
};

module.exports = { logger, loggingMiddleware };