const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Game state
let boardState = Array(9).fill(null).map(() => Array(9).fill(''));
let currentPlayer = 'X';
let players = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Check for a winner
const checkWinner = (board) => {
  const winningCombinations = [
    // Rows, Columns, and Diagonals
    ...Array.from({ length: 3 }, (_, i) => [[i, 0], [i, 1], [i, 2]]), // Rows
    ...Array.from({ length: 3 }, (_, i) => [[0, i], [1, i], [2, i]]), // Columns
    [[[0, 0], [1, 1], [2, 2]]], // Diagonal
    [[[0, 2], [1, 1], [2, 0]]]  // Anti-Diagonal
  ];

  for (const combination of winningCombinations) {
    const [a, b, c] = combination;
    if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
      return board[a[0]][a[1]];
    }
  }
  return null;
};

io.on('connection', (socket) => {
  console.log('A user connected');

  if (Object.keys(players).length < 2) {
    players[socket.id] = currentPlayer;
    socket.emit('assignSymbol', currentPlayer);
    socket.broadcast.emit('playerJoined', currentPlayer);
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  } else {
    socket.emit('gameFull');
    return;
  }

  socket.on('makeMove', (data) => {
    const { gridIndex, cellIndex } = data;
    if (!boardState[gridIndex][cellIndex]) {
      boardState[gridIndex][cellIndex] = players[socket.id];
      const winner = checkWinner(boardState);
      io.emit('updateBoard', { boardState, winner });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
    if (Object.keys(players).length === 0) {
      boardState = Array(9).fill(null).map(() => Array(9).fill(''));
      currentPlayer = 'X';
    }
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});