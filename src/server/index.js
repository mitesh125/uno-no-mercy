import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { TimerService } from './timerService.js';
import { setupSocketHandlers } from './socketHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const timerService = new TimerService();

setupSocketHandlers(io, roomManager, timerService);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../../dist')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fallback: serve index.html for any non-API route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`UNO No Mercy server listening on port ${PORT}`);
});

export { app, httpServer, io, roomManager, timerService };
