// TODO: Setup & export instance socket.io-client, connect ke server custom.
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(); // TODO: isi URL server socket
  }
  return socket;
}
