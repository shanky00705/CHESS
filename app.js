const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
const players = {}; // { white: socketId, black: socketId }

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index', { title: "Chess Game" });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Assign role
  if (!players.white) {
    players.white = socket.id;
    socket.emit('playerColor', 'w');
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit('playerColor', 'b');
  } else {
    socket.emit('playerColor', 'spectator');
  }

  // 🔥 Send current board immediately
  socket.emit('boardState', chess.fen());

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    if (socket.id === players.white) delete players.white;
    if (socket.id === players.black) delete players.black;

    // Optional: reset game if no players
    if (!players.white && !players.black) {
      chess.reset();
    }
  });

  socket.on('move', (move) => {
    try {
      if (chess.turn() === 'w' && socket.id !== players.white) return;
      if (chess.turn() === 'b' && socket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        io.emit('move', move);
        io.emit('boardState', chess.fen());
      } else {
        socket.emit('invalidMove', move);
      }
    } catch (err) {
      socket.emit('invalidMove', move);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
