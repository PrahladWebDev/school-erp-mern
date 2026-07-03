import { io } from 'socket.io-client';

// ─── Socket URL resolution ──────────────────────────────────────────────────────
// In dev, CRA's `proxy` field forwards WebSocket upgrades too, so connecting to
// the page's own origin (no URL passed to io()) works through the proxy. In
// production, derive the bare server origin from REACT_APP_API_URL (which
// usually ends in `/api`), or use REACT_APP_SOCKET_URL if explicitly set.
function resolveSocketUrl() {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return origin || undefined; // undefined => same-origin
}

let socket = null;

/**
 * Connect (or reuse an existing connection) to the notifications socket.
 * Reads the latest accessToken/schoolId from localStorage on every connect
 * attempt — including reconnects — so a refreshed token is picked up
 * automatically without needing to manually recreate the socket.
 */
export function connectSocket() {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(resolveSocketUrl(), {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb({
      token: localStorage.getItem('accessToken'),
      schoolId: localStorage.getItem('schoolId'),
    }),
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
