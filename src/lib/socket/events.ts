// Daftar nama event socket sebagai constants (hindari typo string literal).
export const SOCKET_EVENTS = {
  PIECE_MOVE: 'piece:move',
  PIECE_LOCK: 'piece:lock',
  PIECE_UNLOCK: 'piece:unlock',
  PIECE_PLACED: 'piece:placed',
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  ROOM_COMPLETED: 'room:completed',
} as const;
