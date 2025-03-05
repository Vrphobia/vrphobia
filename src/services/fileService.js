const AWS = require('aws-sdk');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileService {
    constructor(db) {
        this.db = db;
        
        // AWS S3 yapılandırması
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        
        this.bucket = process.env.AWS_S3_BUCKET;
    }

    // Dosya yükle
    async uploadFile(file, userId, type, metadata = {}) {
        const fileHash = crypto
            .createHash('md5')
            .update(file.buffer)
            .digest('hex');

        const fileName = `${Date.now()}-${fileHash}${path.extname(file.originalname)}`;
        const key = `uploads/${type}/${fileName}`;

        // Dosya türüne göre işlem
        let processedBuffer = file.buffer;
        if (file.mimetype.startsWith('image/')) {
            processedBuffer = await this.processImage(file.buffer);
        }

        // S3'e yükle
        const uploadResult = await this.s3.upload({
            Bucket: this.bucket,
            Key: key,
            Body: processedBuffer,
            ContentType: file.mimetype,
            Metadata: {
                originalName: file.originalname,
                ...metadata
            }
        }).promise();

        // Veritabanına kaydet
        const [result] = await this.db.execute(`
            INSERT INTO files (
                user_id,
                file_name,
                original_name,
                file_type,
                mime_type,
                size,
                storage_path,
                metadata,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            userId,
            fileName,
            file.originalname,
            type,
            file.mimetype,
            file.size,
            uploadResult.Location,
            JSON.stringify(metadata)
        ]);

        return {
            id: result.insertId,
            url: uploadResult.Location,
            fileName,
            originalName: file.originalname
        };
    }

    // Resim işleme
    async processImage(buffer) {
        return await sharp(buffer)
            .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();
    }

    // Dosya indir
    async downloadFile(fileId, userId) {
        const [file] = await this.db.execute(`
            SELECT * FROM files WHERE id = ? AND user_id = ?
        `, [fileId, userId]);

        if (!file.length) {
            throw new Error('Dosya bulunamadı');
        }

        const key = `uploads/${file[0].file_type}/${file[0].file_name}`;
        
        const downloadResult = await this.s3.getObject({
            Bucket: this.bucket,
            Key: key
        }).promise();

        return {
            buffer: downloadResult.Body,
            contentType: file[0].mime_type,
            fileName: file[0].original_name
        };
    }

    // Dosya sil
    async deleteFile(fileId, userId) {
        const [file] = await this.db.execute(`
            SELECT * FROM files WHERE id = ? AND user_id = ?
        `, [fileId, userId]);

        if (!file.length) {
            throw new Error('Dosya bulunamadı');
        }

        const key = `uploads/${file[0].file_type}/${file[0].file_name}`;

        // S3'den sil
        await this.s3.deleteObject({
            Bucket: this.bucket,
            Key: key
        }).promise();

        // Veritabanından sil
        await this.db.execute(`
            DELETE FROM files WHERE id = ?
        `, [fileId]);

        return true;
    }

    // Dosya listesi
    async listFiles(userId, type = null, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM files WHERE user_id = ?';
        const params = [userId];

        if (type) {
            query += ' AND file_type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [files] = await this.db.execute(query, params);
        const [total] = await this.db.execute(
            'SELECT COUNT(*) as count FROM files WHERE user_id = ?' + 
            (type ? ' AND file_type = ?' : ''),
            type ? [userId, type] : [userId]
        );

        return {
            files,
            total: total[0].count,
            page,
            totalPages: Math.ceil(total[0].count / limit)
        };
    }

    // Dosya paylaş
    async shareFile(fileId, userId, sharedWithId, expiresAt = null) {
        const [file] = await this.db.execute(`
            SELECT * FROM files WHERE id = ? AND user_id = ?
        `, [fileId, userId]);

        if (!file.length) {
            throw new Error('Dosya bulunamadı');
        }

        // Paylaşım kaydı oluştur
        await this.db.execute(`
            INSERT INTO file_shares (
                file_id,
                shared_by,
                shared_with,
                expires_at,
                created_at
            ) VALUES (?, ?, ?, ?, NOW())
        `, [fileId, userId, sharedWithId, expiresAt]);

        return true;
    }

    // Paylaşım kaldır
    async removeShare(fileId, userId, sharedWithId) {
        await this.db.execute(`
            DELETE FROM file_shares 
            WHERE file_id = ? 
                AND shared_by = ? 
                AND shared_with = ?
        `, [fileId, userId, sharedWithId]);

        return true;
    }

    // Paylaşılan dosyaları listele
    async listSharedFiles(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const [files] = await this.db.execute(`
            SELECT 
                f.*,
                fs.shared_by,
                fs.shared_with,
                fs.expires_at,
                u.name as shared_by_name
            FROM files f
            JOIN file_shares fs ON f.id = fs.file_id
            JOIN users u ON fs.shared_by = u.id
            WHERE fs.shared_with = ?
                AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
            ORDER BY fs.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        const [total] = await this.db.execute(`
            SELECT COUNT(*) as count
            FROM file_shares
            WHERE shared_with = ?
                AND (expires_at IS NULL OR expires_at > NOW())
        `, [userId]);

        return {
            files,
            total: total[0].count,
            page,
            totalPages: Math.ceil(total[0].count / limit)
        };
    }

    // Dosya meta verilerini güncelle
    async updateFileMetadata(fileId, userId, metadata) {
        await this.db.execute(`
            UPDATE files 
            SET metadata = ?
            WHERE id = ? AND user_id = ?
        `, [JSON.stringify(metadata), fileId, userId]);

        return true;
    }
}

module.exports = FileService;
