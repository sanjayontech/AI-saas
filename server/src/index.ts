import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// API routes
app.use('/api/v1', routes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle chat messages
    socket.on('chatMessage', async (data) => {
        try {
            const { chatbotId, sessionId, message, timestamp } = data;
            
            console.log(`Chat message received - Chatbot: ${chatbotId}, Session: ${sessionId}, Message: ${message}`);
            
            // Import ChatbotService dynamically to avoid circular dependencies
            const { ChatbotService } = await import('./services/ChatbotService');
            const chatbotService = new ChatbotService();
            
            // Process the message and get AI response
            const response = await chatbotService.processMessage({
                chatbotId,
                sessionId,
                message,
                userInfo: {}
            });
            
            // Send response back to client
            socket.emit('chatResponse', {
                sessionId,
                message: response.response,
                timestamp: new Date().toISOString(),
                messageId: response.messageId
            });
            
        } catch (error) {
            console.error('Error processing chat message:', error);
            socket.emit('error', {
                message: 'Failed to process message',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // Handle joining chatbot rooms for targeted messaging
    socket.on('joinChatbot', (chatbotId) => {
        socket.join(`chatbot_${chatbotId}`);
        console.log(`Socket ${socket.id} joined chatbot room: ${chatbotId}`);
    });

    socket.on('leaveChatbot', (chatbotId) => {
        socket.leave(`chatbot_${chatbotId}`);
        console.log(`Socket ${socket.id} left chatbot room: ${chatbotId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io };