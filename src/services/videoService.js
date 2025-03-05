const mediasoup = require('mediasoup');
const { v4: uuidv4 } = require('uuid');

class VideoService {
    constructor() {
        this.workers = new Map();
        this.rooms = new Map();
        this.peers = new Map();
        
        this.initializeWorkers();
    }

    async initializeWorkers() {
        const numWorkers = Object.keys(require('os').cpus()).length;
        
        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: 'warn',
                logTags: [
                    'info',
                    'ice',
                    'dtls',
                    'rtp',
                    'srtp',
                    'rtcp'
                ],
                rtcMinPort: 10000,
                rtcMaxPort: 59999
            });

            worker.on('died', () => {
                console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
                setTimeout(() => process.exit(1), 2000);
            });

            this.workers.set(worker.pid, worker);
        }
    }

    async createRoom(roomId = null) {
        roomId = roomId || uuidv4();
        
        // Worker seç
        const worker = Array.from(this.workers.values())[Math.floor(Math.random() * this.workers.size)];
        
        // Router oluştur
        const router = await worker.createRouter({
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000
                    }
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP9',
                    clockRate: 90000,
                    parameters: {
                        'profile-id': 2,
                        'x-google-start-bitrate': 1000
                    }
                },
                {
                    kind: 'video',
                    mimeType: 'video/h264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '4d0032',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000
                    }
                }
            ]
        });

        const room = {
            id: roomId,
            router,
            peers: new Map(),
            transports: new Map(),
            producers: new Map(),
            consumers: new Map()
        };

        this.rooms.set(roomId, room);
        return room;
    }

    async createWebRtcTransport(roomId, peerId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const transport = await room.router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
            minimumAvailableOutgoingBitrate: 600000,
            maxSctpMessageSize: 262144,
            maxIncomingBitrate: 1500000
        });

        room.transports.set(transport.id, transport);
        
        transport.on('dtlsstatechange', dtlsState => {
            if (dtlsState === 'closed') {
                transport.close();
                room.transports.delete(transport.id);
            }
        });

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters
        };
    }

    async connectTransport(roomId, transportId, dtlsParameters) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const transport = room.transports.get(transportId);
        if (!transport) throw new Error('Transport not found');

        await transport.connect({ dtlsParameters });
    }

    async produce(roomId, transportId, kind, rtpParameters) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const transport = room.transports.get(transportId);
        if (!transport) throw new Error('Transport not found');

        const producer = await transport.produce({
            kind,
            rtpParameters
        });

        room.producers.set(producer.id, producer);

        producer.on('transportclose', () => {
            producer.close();
            room.producers.delete(producer.id);
        });

        return { id: producer.id };
    }

    async consume(roomId, transportId, producerId, rtpCapabilities) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const transport = room.transports.get(transportId);
        if (!transport) throw new Error('Transport not found');

        const producer = room.producers.get(producerId);
        if (!producer) throw new Error('Producer not found');

        if (!room.router.canConsume({
            producerId: producer.id,
            rtpCapabilities
        })) {
            throw new Error('Cannot consume');
        }

        const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: true
        });

        room.consumers.set(consumer.id, consumer);

        consumer.on('transportclose', () => {
            consumer.close();
            room.consumers.delete(consumer.id);
        });

        return {
            id: consumer.id,
            producerId: producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type
        };
    }

    async closeRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Tüm transport'ları kapat
        room.transports.forEach(transport => transport.close());
        
        // Router'ı kapat
        room.router.close();
        
        // Room'u sil
        this.rooms.delete(roomId);
    }

    async getRouterRtpCapabilities(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        return room.router.rtpCapabilities;
    }

    // Ekran paylaşımı için özel transport oluştur
    async createScreenShareTransport(roomId, peerId) {
        const transport = await this.createWebRtcTransport(roomId, peerId);
        return {
            ...transport,
            isScreenShare: true
        };
    }

    // Kayıt için özel transport oluştur
    async createRecordingTransport(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const transport = await room.router.createPlainTransport({
            listenIp: { ip: '127.0.0.1', announcedIp: null },
            rtcpMux: true,
            comedia: true
        });

        room.transports.set(transport.id, transport);
        
        return {
            id: transport.id,
            ip: transport.tuple.localIp,
            port: transport.tuple.localPort,
            rtcpPort: transport.rtcpTuple.localPort
        };
    }
}

module.exports = VideoService;
