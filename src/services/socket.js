import { io } from 'socket.io-client';
import { SOCKET_URL, STORAGE_KEYS } from '../config/campus';

let socket = null;

// Lazy singleton: nothing connects until a page actually needs real-time updates.
// The server requires the same JWT as the REST API and only lets you join your own class room.
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: localStorage.getItem(STORAGE_KEYS.token) }),
    });
  }
  return socket;
}

export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
