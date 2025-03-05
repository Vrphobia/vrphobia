class VideoChat {
    constructor(roomId, userId, userType) {
        this.roomId = roomId;
        this.userId = userId;
        this.userType = userType;
        
        this.socket = io(window.location.origin);
        this.device = null;
        this.producerTransport = null;
        this.consumerTransport = null;
        this.producers = new Map();
        this.consumers = new Map();
        
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.screenShare = null;
        
        this.initializeSocket();
    }

    async initializeSocket() {
        this.socket.on('connect', async () => {
            console.log('Connected to signaling server');
            
            // Odaya katıl
            this.socket.emit('joinRoom', {
                roomId: this.roomId,
                userId: this.userId,
                userType: this.userType
            });
        });

        this.socket.on('rtpCapabilities', async (rtpCapabilities) => {
            await this.loadDevice(rtpCapabilities);
        });

        this.socket.on('newProducer', async ({ producerId, userId, kind }) => {
            await this.consume(producerId, kind);
        });

        this.socket.on('userJoined', ({ userId, userType }) => {
            console.log(`User joined: ${userId} (${userType})`);
        });

        this.socket.on('userLeft', ({ userId }) => {
            console.log(`User left: ${userId}`);
        });
    }

    async loadDevice(routerRtpCapabilities) {
        try {
            this.device = new MediasoupClient.Device();
            await this.device.load({ routerRtpCapabilities });
            await this.initializeTransports();
        } catch (error) {
            console.error('Error loading device:', error);
        }
    }

    async initializeTransports() {
        // Producer transport oluştur
        this.socket.emit('createTransport', { isProducer: true }, async ({ transport }) => {
            this.producerTransport = this.device.createSendTransport(transport);

            this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.socket.emit('connectTransport', {
                    transportId: this.producerTransport.id,
                    dtlsParameters
                }, ({ error }) => {
                    if (error) {
                        errback(error);
                        return;
                    }
                    callback();
                });
            });

            this.producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                this.socket.emit('produce', {
                    transportId: this.producerTransport.id,
                    kind,
                    rtpParameters
                }, ({ id, error }) => {
                    if (error) {
                        errback(error);
                        return;
                    }
                    callback({ id });
                });
            });

            await this.initializeLocalMedia();
        });

        // Consumer transport oluştur
        this.socket.emit('createTransport', { isProducer: false }, async ({ transport }) => {
            this.consumerTransport = this.device.createRecvTransport(transport);

            this.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.socket.emit('connectTransport', {
                    transportId: this.consumerTransport.id,
                    dtlsParameters
                }, ({ error }) => {
                    if (error) {
                        errback(error);
                        return;
                    }
                    callback();
                });
            });
        });
    }

    async initializeLocalMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.localVideo.srcObject = stream;

            // Video producer oluştur
            const videoTrack = stream.getVideoTracks()[0];
            const videoProducer = await this.producerTransport.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 100000 },
                    { maxBitrate: 300000 },
                    { maxBitrate: 900000 }
                ],
                codecOptions: {
                    videoGoogleStartBitrate: 1000
                }
            });
            this.producers.set('video', videoProducer);

            // Audio producer oluştur
            const audioTrack = stream.getAudioTracks()[0];
            const audioProducer = await this.producerTransport.produce({
                track: audioTrack,
                codecOptions: {
                    opusStereo: true,
                    opusDtx: true
                }
            });
            this.producers.set('audio', audioProducer);

        } catch (error) {
            console.error('Error getting user media:', error);
        }
    }

    async consume(producerId, kind) {
        this.socket.emit('consume', {
            transportId: this.consumerTransport.id,
            producerId,
            rtpCapabilities: this.device.rtpCapabilities
        }, async ({ consumer, error }) => {
            if (error) {
                console.error('Error consuming:', error);
                return;
            }

            const { id, kind, rtpParameters } = consumer;
            const newConsumer = await this.consumerTransport.consume({
                id,
                producerId,
                kind,
                rtpParameters
            });

            this.consumers.set(kind, newConsumer);

            const { track } = newConsumer;

            if (kind === 'video') {
                this.remoteVideo.srcObject = new MediaStream([track]);
            } else if (kind === 'audio') {
                const audioStream = new MediaStream([track]);
                const audioElement = new Audio();
                audioElement.srcObject = audioStream;
                audioElement.play();
            }

            // Consumer'ı başlat
            this.socket.emit('resumeConsumer', { consumerId: id });
        });
    }

    async startScreenShare() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            this.socket.emit('startScreenShare', async ({ transport }) => {
                const screenShareTransport = this.device.createSendTransport(transport);

                screenShareTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    this.socket.emit('connectTransport', {
                        transportId: screenShareTransport.id,
                        dtlsParameters
                    }, ({ error }) => {
                        if (error) {
                            errback(error);
                            return;
                        }
                        callback();
                    });
                });

                screenShareTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                    this.socket.emit('produce', {
                        transportId: screenShareTransport.id,
                        kind,
                        rtpParameters
                    }, ({ id, error }) => {
                        if (error) {
                            errback(error);
                            return;
                        }
                        callback({ id });
                    });
                });

                const track = stream.getVideoTracks()[0];
                this.screenShare = await screenShareTransport.produce({
                    track,
                    encodings: [
                        { maxBitrate: 1500000 }
                    ]
                });
            });
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    }

    stopScreenShare() {
        if (this.screenShare) {
            this.screenShare.close();
            this.screenShare = null;
        }
    }

    async startRecording() {
        this.socket.emit('startRecording', ({ transport }) => {
            console.log('Recording started:', transport);
        });
    }

    async stopRecording() {
        this.socket.emit('stopRecording');
    }

    toggleVideo() {
        const videoProducer = this.producers.get('video');
        if (videoProducer) {
            if (videoProducer.paused) {
                videoProducer.resume();
            } else {
                videoProducer.pause();
            }
        }
    }

    toggleAudio() {
        const audioProducer = this.producers.get('audio');
        if (audioProducer) {
            if (audioProducer.paused) {
                audioProducer.resume();
            } else {
                audioProducer.pause();
            }
        }
    }

    leaveRoom() {
        // Tüm medya bağlantılarını kapat
        this.producers.forEach(producer => producer.close());
        this.consumers.forEach(consumer => consumer.close());

        if (this.producerTransport) {
            this.producerTransport.close();
        }

        if (this.consumerTransport) {
            this.consumerTransport.close();
        }

        // Ekran paylaşımını durdur
        this.stopScreenShare();

        // Socket bağlantısını kapat
        this.socket.emit('leaveRoom');
        this.socket.disconnect();
    }
}

// Video görüşmesi başlat
function startVideoChat(roomId, userId, userType) {
    const videoChat = new VideoChat(roomId, userId, userType);
    return videoChat;
}
