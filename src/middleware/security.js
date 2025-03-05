const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.'
});

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'sessionId', // Don't use default connect.sid
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    },
    resave: false,
    saveUninitialized: false
};

// Password validation middleware
const validatePassword = (req, res, next) => {
    const password = req.body.password;
    
    if (!password) {
        return res.status(400).json({ error: 'Şifre gereklidir' });
    }

    // Password must be at least 8 characters long and contain at least one number, 
    // one lowercase letter, one uppercase letter, and one special character
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: 'Şifre en az 8 karakter uzunluğunda olmalı ve en az bir rakam, bir küçük harf, bir büyük harf ve bir özel karakter içermelidir'
        });
    }

    next();
};

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://yourproductiondomain.com' 
        : 'http://localhost:3002',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Security headers middleware using helmet
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
});

// IP filtering middleware
const ipFilter = (req, res, next) => {
    const clientIp = req.ip;
    // Add your IP whitelist/blacklist logic here
    next();
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
    // Sanitize request body, params, and query
    // Add your sanitization logic here
    next();
};

module.exports = {
    limiter,
    sessionConfig,
    validatePassword,
    corsOptions,
    securityHeaders,
    ipFilter,
    sanitizeRequest
};
