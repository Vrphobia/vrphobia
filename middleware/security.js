const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Authentication rate limiting
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // Start blocking after 5 failed attempts
    message: 'Too many failed login attempts, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false
});

const securityMiddleware = {
    // Basic security headers
    helmet: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'fonts.gstatic.com'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: "same-site" },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true
    }),

    // Rate limiting
    rateLimiter: limiter,
    authRateLimiter: authLimiter,

    // Data sanitization
    mongoSanitize: mongoSanitize(),
    
    // XSS prevention middleware
    xssPrevention: (req, res, next) => {
        if (req.body) {
            // Sanitize request body
            for (let key in req.body) {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = DOMPurify.sanitize(req.body[key]);
                }
            }
        }
        if (req.query) {
            // Sanitize query parameters
            for (let key in req.query) {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = DOMPurify.sanitize(req.query[key]);
                }
            }
        }
        next();
    },
    
    hpp: hpp(),

    // Custom security middleware
    customSecurity: (req, res, next) => {
        // Remove sensitive headers
        res.removeHeader('X-Powered-By');
        
        // Add security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        
        // Prevent clickjacking
        res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
        
        next();
    },

    // Error handling middleware
    errorHandler: (err, req, res, next) => {
        console.error(err.stack);

        // Log error to monitoring service
        if (process.env.NODE_ENV === 'production') {
            // TODO: Implement error logging service
            // errorLoggingService.log(err);
        }

        // Don't leak error details in production
        const error = process.env.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : err.message;

        res.status(err.status || 500).json({
            success: false,
            error
        });
    }
};

module.exports = securityMiddleware;
