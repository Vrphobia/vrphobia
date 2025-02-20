const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { checkAuth } = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file types
        const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: File upload only supports the following filetypes - ' + filetypes);
        }
    }
});

// @route   POST api/uploads
// @desc    Upload a file
// @access  Private
router.post('/', checkAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        res.json({
            fileName: req.file.filename,
            filePath: `/uploads/${req.file.filename}`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/uploads/:filename
// @desc    Get uploaded file
// @access  Private
router.get('/:filename', checkAuth, (req, res) => {
    try {
        const file = path.join(__dirname, '../uploads', req.params.filename);
        res.sendFile(file);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/uploads/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', checkAuth, (req, res) => {
    try {
        const file = path.join(__dirname, '../uploads', req.params.filename);
        fs.unlink(file, (err) => {
            if (err) {
                console.error(err);
                return res.status(404).json({ msg: 'File not found' });
            }
            res.json({ msg: 'File deleted' });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
