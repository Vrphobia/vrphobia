const compression = require('compression');
const responseTime = require('response-time');

const performanceMiddleware = {
    // Compression middleware
    compression: compression({
        level: 6,
        threshold: 100 * 1024, // 100kb
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    }),

    // Response time tracking
    responseTime: responseTime((req, res, time) => {
        // Log response time
        if (time > 1000) { // If response takes more than 1 second
            console.warn(`Slow response detected: ${req.method} ${req.url} - ${time}ms`);
        }
    }),

    // Cache control
    cacheControl: (req, res, next) => {
        // Static assets
        if (req.url.match(/\.(css|js|jpg|png|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
        // API responses
        else if (req.url.startsWith('/api')) {
            res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        next();
    },

    // Performance monitoring
    performanceMonitor: (req, res, next) => {
        const start = process.hrtime();

        // Add response hook
        res.on('finish', () => {
            const diff = process.hrtime(start);
            const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

            // Log performance metrics
            const metrics = {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                responseTime: time,
                timestamp: new Date().toISOString(),
                userAgent: req.get('user-agent'),
                contentLength: res.get('content-length'),
                referrer: req.get('referrer') || req.get('referer'),
            };

            // In production, send to monitoring service
            if (process.env.NODE_ENV === 'production') {
                // TODO: Implement metrics logging service
                // metricsService.log(metrics);
            }

            // Log slow responses
            if (time > 1000) {
                console.warn('Slow Response:', metrics);
            }
        });

        next();
    },

    // Memory usage monitoring
    memoryMonitor: (req, res, next) => {
        const used = process.memoryUsage();
        const metrics = {
            rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
        };

        // Log if memory usage is high
        if (used.heapUsed > 0.8 * used.heapTotal) {
            console.warn('High memory usage detected:', metrics);
        }

        next();
    }
};

module.exports = performanceMiddleware;
