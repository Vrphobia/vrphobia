const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
    }

    // Handle new WebSocket connections
    handleConnection(ws, req) {
        ws.isAlive = true;

        // Handle client messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                // Handle authentication
                if (data.type === 'auth') {
                    this.authenticateClient(ws, data.token);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        // Handle client disconnection
        ws.on('close', () => {
            this.clients.forEach((client, userId) => {
                if (client === ws) {
                    this.clients.delete(userId);
                }
            });
        });

        // Handle pings to keep connection alive
        ws.on('pong', () => {
            ws.isAlive = true;
        });
    }

    // Authenticate client connection
    authenticateClient(ws, token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.user.id;
            
            // Store client connection
            this.clients.set(userId, ws);
            
            // Send confirmation
            ws.send(JSON.stringify({
                type: 'auth',
                status: 'success'
            }));
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'auth',
                status: 'error',
                message: 'Authentication failed'
            }));
        }
    }

    // Send notification to specific user
    sendToUser(userId, notification) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'notification',
                data: notification
            }));
        }
    }

    // Send notification to all users in a company
    sendToCompany(companyId, notification, excludeUserId = null) {
        this.clients.forEach((client, userId) => {
            if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'notification',
                    data: notification
                }));
            }
        });
    }

    // Send notification to all connected clients
    broadcast(notification, excludeUserId = null) {
        this.clients.forEach((client, userId) => {
            if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'notification',
                    data: notification
                }));
            }
        });
    }

    // Start heartbeat to keep connections alive
    startHeartbeat() {
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) return ws.terminate();
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }
}

module.exports = WebSocketServer;
