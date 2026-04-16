const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let legalMoves = [];

/* ---------------- RENDER BOARD ---------------- */
const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      const squareEl = document.createElement("div");
      squareEl.classList.add(
        "square",
        (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
      );

      squareEl.dataset.row = rowIndex;
      squareEl.dataset.col = colIndex;

      // highlight legal moves
      if (legalMoves.some(m => m.row === rowIndex && m.col === colIndex)) {
        squareEl.classList.add("highlight");
      }

      // highlight source square
      if (
        sourceSquare &&
        sourceSquare.row === rowIndex &&
        sourceSquare.col === colIndex
      ) {
        squareEl.classList.add("source");
      }

      if (square) {
        const pieceEl = document.createElement("div");
        pieceEl.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceEl.innerText = getPieceUnicode(square);
        pieceEl.draggable = playerRole === square.color;

        /* 🔥 IMPORTANT FIX */
        pieceEl.addEventListener("mousedown", () => {
          if (playerRole !== square.color) return;
          sourceSquare = { row: rowIndex, col: colIndex };
          showLegalMoves(sourceSquare);
        });

        pieceEl.addEventListener("dragstart", (e) => {
          if (playerRole !== square.color) {
            e.preventDefault();
            return;
          }
          draggedPiece = pieceEl;
          e.dataTransfer.setData("text/plain", "");
        });

        pieceEl.addEventListener("dragend", clearHighlights);

        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener("dragover", e => e.preventDefault());

      squareEl.addEventListener("drop", () => {
        if (!draggedPiece) return;

        const target = { row: rowIndex, col: colIndex };
        handleMove(sourceSquare, target);
        clearHighlights();
      });

      boardElement.appendChild(squareEl);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
};

/* ---------------- MOVE HANDLING ---------------- */
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q"
  };
  socket.emit("move", move);
};

/* ---------------- LEGAL MOVES ---------------- */
const showLegalMoves = (source) => {
  const from = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;

  legalMoves = chess.moves({ square: from, verbose: true }).map(m => ({
    row: 8 - parseInt(m.to[1]),
    col: m.to.charCodeAt(0) - 97
  }));

  renderBoard();
};

const clearHighlights = () => {
  draggedPiece = null;
  sourceSquare = null;
  legalMoves = [];
  renderBoard();
};

/* ---------------- PIECE UNICODE ---------------- */
const getPieceUnicode = (piece) => {
  const map = {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟"
  };
  return map[piece.type];
};

/* ---------------- SOCKET EVENTS ---------------- */
socket.on("playerColor", role => {
  playerRole = role === "spectator" ? null : role;
  renderBoard();
});

socket.on("boardState", fen => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", move => {
  chess.move(move);
  renderBoard();
});

/* Optional UX improvement */
boardElement.addEventListener("mouseleave", clearHighlights);

renderBoard();
