/**
 * Manages userId → Set<socketId> mappings so the friendship controller
 * can push real-time events to specific users without importing `io` directly.
 *
 * Call socketManager.init(io) once during server startup, then use
 * socketManager.emitToUser(userId, event, data) anywhere in the app.
 */

let _io = null;
// Map<string, Set<string>>  userId → set of socketIds (supports multiple tabs/devices)
const userSockets = new Map();

const socketManager = {
  /** Must be called once with the socket.io Server instance */
  init(io) {
    _io = io;
  },

  /** Register a socket connection for a user */
  register(userId, socketId) {
    const id = String(userId);
    if (!userSockets.has(id)) userSockets.set(id, new Set());
    userSockets.get(id).add(socketId);
  },

  /** Remove a socket connection (on disconnect) */
  unregister(userId, socketId) {
    const id = String(userId);
    const sockets = userSockets.get(id);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) userSockets.delete(id);
    }
  },

  /** Emit an event to all active sockets of a given user */
  emitToUser(userId, event, data) {
    if (!_io) return;
    const id = String(userId);
    const sockets = userSockets.get(id);
    if (sockets) sockets.forEach((sid) => _io.to(sid).emit(event, data));
  },
};

module.exports = socketManager;
