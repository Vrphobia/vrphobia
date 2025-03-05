const express = require('express');
const router = express.Router();
const VideoService = require('../services/videoService');
const { authenticateToken } = require('../middleware/auth');

let videoService;

// WebSocket bağlantılarını yönetmek için
const handleSocket = (io) => {
    videoService = new VideoService();

    io.on('connection', async (socket) => {
        console.log('Client connected:', socket.id);

        // Odaya katıl
        socket.on('joinRoom', async ({ roomId, userId, userType }) => {
            try {
                let room = videoService.rooms.get(roomId);
                
                if (!room) {
                    room = await videoService.createRoom(roomId);
                }

                // Kullanıcıyı odaya ekle
                socket.roomId = roomId;
                socket.userId = userId;
                socket.userType = userType;
                socket.join(roomId);

                // RTP yeteneklerini gönder
                const rtpCapabilities = await videoService.getRouterRtpCapabilities(roomId);
                socket.emit('rtpCapabilities', rtpCapabilities);

                // Odadaki diğer kullanıcılara bildir
                socket.to(roomId).emit('userJoined', {
                    userId,
                    userType
                });
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', error.message);
            }
        });

        // WebRTC Transport oluştur
        socket.on('createTransport', async ({ isProducer }, callback) => {
            try {
                const { roomId, userId } = socket;
                const transport = await videoService.createWebRtcTransport(roomId, userId);
                
                // Transport olaylarını dinle
                transport.observer.on('close', () => {
                    console.log('Transport closed');
                });

                callback({ transport });
            } catch (error) {
                console.error('Error creating transport:', error);
                callback({ error: error.message });
            }
        });

        // Transport'u bağla
        socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
            try {
                await videoService.connectTransport(socket.roomId, transportId, dtlsParameters);
                callback({ success: true });
            } catch (error) {
                console.error('Error connecting transport:', error);
                callback({ error: error.message });
            }
        });

        // Medya üret (produce)
        socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
            try {
                const { id } = await videoService.produce(
                    socket.roomId,
                    transportId,
                    kind,
                    rtpParameters
                );

                // Diğer kullanıcılara bildir
                socket.to(socket.roomId).emit('newProducer', {
                    producerId: id,
                    userId: socket.userId,
                    kind
                });

                callback({ id });
            } catch (error) {
                console.error('Error producing:', error);
                callback({ error: error.message });
            }
        });

        // Medya tüket (consume)
        socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
            try {
                const consumer = await videoService.consume(
                    socket.roomId,
                    transportId,
                    producerId,
                    rtpCapabilities
                );

                callback({ consumer });
            } catch (error) {
                console.error('Error consuming:', error);
                callback({ error: error.message });
            }
        });

        // Ekran paylaşımı başlat
        socket.on('startScreenShare', async (callback) => {
            try {
                const transport = await videoService.createScreenShareTransport(
                    socket.roomId,
                    socket.userId
                );

                callback({ transport });
            } catch (error) {
                console.error('Error starting screen share:', error);
                callback({ error: error.message });
            }
        });

        // Görüşme kaydı başlat
        socket.on('startRecording', async (callback) => {
            try {
                const transport = await videoService.createRecordingTransport(socket.roomId);
                callback({ transport });
            } catch (error) {
                console.error('Error starting recording:', error);
                callback({ error: error.message });
            }
        });

        // Odadan ayrıl
        socket.on('leaveRoom', async () => {
            try {
                const { roomId, userId } = socket;
                if (!roomId) return;

                // Odadaki diğer kullanıcılara bildir
                socket.to(roomId).emit('userLeft', { userId });

                // Odadan ayrıl
                socket.leave(roomId);
                
                // Oda boşsa kapat
                const room = io.sockets.adapter.rooms.get(roomId);
                if (!room || room.size === 0) {
                    await videoService.closeRoom(roomId);
                }

                delete socket.roomId;
                delete socket.userId;
                delete socket.userType;
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        });

        // Bağlantı koptuğunda
        socket.on('disconnect', async () => {
            try {
                const { roomId, userId } = socket;
                if (!roomId) return;

                // Odadaki diğer kullanıcılara bildir
                socket.to(roomId).emit('userLeft', { userId });

                // Oda boşsa kapat
                const room = io.sockets.adapter.rooms.get(roomId);
                if (!room || room.size === 0) {
                    await videoService.closeRoom(roomId);
                }
            } catch (error) {
                console.error('Error on disconnect:', error);
            }
        });
    });
};

// HTTP rotaları
router.post('/room', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await videoService.createRoom(roomId);
        res.json({ roomId: room.id });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/room/:roomId/capabilities', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const capabilities = await videoService.getRouterRtpCapabilities(roomId);
        res.json(capabilities);
    } catch (error) {
        console.error('Error getting capabilities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { router, handleSocket };
