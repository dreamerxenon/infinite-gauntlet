// engine.js — Pure game logic

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// Winner check 
function checkWinner(state) {
  for (const [a,b,c] of WIN_PATTERNS) {
    if (state[a] && state[a] === state[b] && state[b] === state[c])
      return state[a]; // 'X' or 'O'
  }
  if (state.every(s => s !== '')) return 'Draw';
  return null;
}

function getWinPattern(state) {
  for (const p of WIN_PATTERNS) {
    const [a,b,c] = p;
    if (state[a] && state[a] === state[b] && state[b] === state[c]) return p;
  }
  return null;
}

function getEmpty(state) {
  return state.reduce((acc, v, i) => { if (v === '') acc.push(i); return acc; }, []);
}

//  Minimax 
function miniScore(state, xTurn) {
  const w = checkWinner(state);
  if (w === 'X')    return  1;
  if (w === 'O')    return -1;
  if (w === 'Draw') return  0;
  const empty = getEmpty(state);
  if (!empty.length) return 0;
  if (xTurn) {
    let best = -Infinity;
    for (const i of empty) { state[i]='X'; best=Math.max(best,miniScore([...state],false)); state[i]=''; }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) { state[i]='O'; best=Math.min(best,miniScore([...state],true));  state[i]=''; }
    return best;
  }
}

function getBestMoveForO(state) {
  let best = Infinity, bestMove = -1;
  for (const i of getEmpty(state)) {
    state[i] = 'O';
    const score = miniScore([...state], true);
    state[i] = '';
    if (score < best) { best = score; bestMove = i; }
  }
  return bestMove;
}

// Solver — can player win in maxMoves? 
function solve(state, isPlayer, movesLeft) {
  const w = checkWinner(state);
  if (w === 'X')              return true;
  if (w === 'O' || w==='Draw') return false;
  if (movesLeft === 0)         return false;
  const empty = getEmpty(state);
  if (!empty.length)           return false;

  if (isPlayer) {
    for (const i of empty) {
      state[i] = 'X';
      if (solve([...state], false, movesLeft - 1)) { state[i] = ''; return true; }
      state[i] = '';
    }
    return false;
  } else {
    const best = getBestMoveForO(state);
    if (best === -1) return false;
    state[best] = 'O';
    const r = solve([...state], true, movesLeft);
    state[best] = '';
    return r;
  }
}

function canPlayerWin(state, maxMoves) {
  return solve([...state], true, maxMoves);
}

// Puzzle generator 
function generatePuzzle(movesAllowed) {
  let attempts = 0;
  while (true) {
    attempts++;
    const board = Array(9).fill('');
    const steps = 2 + Math.floor(Math.random() * 3); // 2-4 pre-placed pieces
    let turn = 'X';
    for (let i = 0; i < steps; i++) {
      const empty = getEmpty(board);
      if (!empty.length) break;
      board[empty[Math.floor(Math.random() * empty.length)]] = turn;
      turn = turn === 'X' ? 'O' : 'X';
    }
    // Reject if already won or unsolvable
    if (checkWinner(board)) continue;
    if (canPlayerWin([...board], movesAllowed)) return board;
    if (attempts > 600) return Array(9).fill(''); // fallback
  }
}

//  Moves allowed per level 
function getMovesForLevel(level) {
  return level < 5 ? 3 : 2;
}

//  Difficulty label
function getDifficulty(level) {
  if (level < 5)  return 'easy';
  if (level < 12) return 'medium';
  return 'hard';
}

// XP earned for winning a level 
function getXPForLevel(level) {
  return level; // XP = level number
}