const express = require('express');
const router = express.Router();
const multer = require('multer');
const FileService = require('../services/fileService');
const { authenticateToken } = require('../middleware/auth');

// Multer yapılandırması
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maksimum 5 dosya
    }
});

// Middleware to initialize file service
router.use((req, res, next) => {
    req.fileService = new FileService(req.db);
    next();
});

// Dosya yükle
router.post('/upload', authenticateToken, upload.array('files'), async (req, res) => {
    try {
        const { type, metadata } = req.body;
        const uploadResults = [];

        for (const file of req.files) {
            const result = await req.fileService.uploadFile(
                file,
                req.user.id,
                type,
                JSON.parse(metadata || '{}')
            );
            uploadResults.push(result);
        }

        res.status(201).json({
            message: 'Dosyalar başarıyla yüklendi',
            files: uploadResults
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dosya indir
router.get('/download/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await req.fileService.downloadFile(fileId, req.user.id);

        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.send(file.buffer);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dosya sil
router.delete('/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        await req.fileService.deleteFile(fileId, req.user.id);
        res.json({ message: 'Dosya başarıyla silindi' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dosya listesi
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type, page = 1, limit = 10 } = req.query;
        const files = await req.fileService.listFiles(
            req.user.id,
            type,
            parseInt(page),
            parseInt(limit)
        );
        res.json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dosya paylaş
router.post('/:fileId/share', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { sharedWithId, expiresAt } = req.body;

        await req.fileService.shareFile(
            fileId,
            req.user.id,
            sharedWithId,
            expiresAt
        );

        res.json({ message: 'Dosya başarıyla paylaşıldı' });
    } catch (error) {
        console.error('Error sharing file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Paylaşım kaldır
router.delete('/:fileId/share/:sharedWithId', authenticateToken, async (req, res) => {
    try {
        const { fileId, sharedWithId } = req.params;

        await req.fileService.removeShare(
            fileId,
            req.user.id,
            sharedWithId
        );

        res.json({ message: 'Dosya paylaşımı kaldırıldı' });
    } catch (error) {
        console.error('Error removing share:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Paylaşılan dosyaları listele
router.get('/shared', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const files = await req.fileService.listSharedFiles(
            req.user.id,
            parseInt(page),
            parseInt(limit)
        );
        res.json(files);
    } catch (error) {
        console.error('Error listing shared files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dosya meta verilerini güncelle
router.put('/:fileId/metadata', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { metadata } = req.body;

        await req.fileService.updateFileMetadata(
            fileId,
            req.user.id,
            metadata
        );

        res.json({ message: 'Dosya meta verileri güncellendi' });
    } catch (error) {
        console.error('Error updating file metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
