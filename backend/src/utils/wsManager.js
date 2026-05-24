import { Server } from 'socket.io';

let ioInstance = null;
const logHistory = new Map(); // projectId -> Array of log objects

export const wsManager = {
  init(server) {
    const io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins in dev
        methods: ['GET', 'POST']
      }
    });
    ioInstance = io;

    io.on('connection', (socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      // Join room for specific project rendering
      socket.on('join-project', (projectId) => {
        socket.join(projectId);
        console.log(`[Socket.io] Client ${socket.id} joined project room: ${projectId}`);
        
        socket.emit('connected', {
          message: `Connected to Socket.io render logs room: ${projectId}`
        });

        // Replay log history if available
        const history = logHistory.get(projectId);
        if (history && history.length > 0) {
          console.log(`[Socket.io] Replaying ${history.length} logs to client ${socket.id}`);
          for (const logObj of history) {
            socket.emit('log', logObj);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      });
    });
  },

  /**
   * Clear cached log history for a project
   */
  clearHistory(projectId) {
    logHistory.delete(projectId);
  },

  /**
   * Broadcast an event to all connected clients in a project room
   */
  broadcast(projectId, eventName, data) {
    if (!ioInstance) return;
    ioInstance.to(projectId).emit(eventName, data);
  },

  /**
   * Broadcast a log event
   */
  log(projectId, { message, progress, currentStage = '', currentScene = 0, eta = 0, renderSpeed = 0 }) {
    console.log(`[Socket.io Log] [${projectId}] [${currentStage}] ${message} (${progress}%)`);
    const logObj = {
      message,
      progress,
      currentStage,
      currentScene,
      eta,
      renderSpeed,
      timestamp: new Date().toISOString()
    };

    // Store in history
    if (!logHistory.has(projectId)) {
      logHistory.set(projectId, []);
    }
    logHistory.get(projectId).push(logObj);

    this.broadcast(projectId, 'log', logObj);
  }
};

export default wsManager;
