const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { loggingMiddleware, logger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const urlRoutes = require('./routes/urlRoutes');
const urlService = require('./services/urlService');

const app = express();


app.use(helmet());


app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use(loggingMiddleware);


app.use('/', urlRoutes);


app.use(notFoundHandler);


app.use(errorHandler);


setInterval(() => {
    try {
        urlService.cleanupExpiredUrls();
    } catch (error) {
        logger.error('Error during cleanup', {
            error: error.message,
            stack: error.stack
        });
    }
}, 5 * 60 * 1000);

module.exports = app;