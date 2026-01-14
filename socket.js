const { Server } = require('socket.io');

let io;

// Map userId to socketId for targeted notifications
const userSocketMap = new Map();

/**
 * Initialize Socket.io with the HTTP server
 * @param {http.Server} server - HTTP server instance
 */
function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id);

        // User registers their userId when they connect
        socket.on('register', (userId) => {
            if (userId) {
                userSocketMap.set(userId, socket.id);
                console.log(`👤 User ${userId} registered with socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            // Remove user from map on disconnect
            for (const [userId, socketId] of userSocketMap.entries()) {
                if (socketId === socket.id) {
                    userSocketMap.delete(userId);
                    console.log(`👤 User ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
}

/**
 * Get the Socket.io instance
 * @returns {Server} Socket.io server instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized! Call initSocket first.');
    }
    return io;
}

/**
 * Send notification to a specific user
 * @param {string} userId - Target user's ID
 * @param {object} notification - Notification data
 */
function sendNotificationToUser(userId, notification) {
    const socketId = userSocketMap.get(userId.toString());
    if (socketId) {
        io.to(socketId).emit('new_notification', notification);
        console.log(`📤 Notification sent to user ${userId}`);
    }
}

/**
 * Broadcast notification to all connected users
 * @param {object} notification - Notification data
 */
function broadcastNotification(notification) {
    io.emit('new_notification', notification);
}

module.exports = {
    initSocket,
    getIO,
    sendNotificationToUser,
    broadcastNotification,
    userSocketMap
};
