// game.js — Main game controller
// Wires engine.js + ui.js + config.js

//  State 
let board        = Array(9).fill('');
let level        = 1;
let movesAllowed = 3;
let movesUsed    = 0;
let playerTurn   = true;
let gameOver     = false;
let aiBlocked    = false;
let bestLevel    = 0;
let walletAddress = null;
let isGuest      = false;
let claimedBadges = new Set();
let pendingBadge  = null;

// Battlepass state
let allBattlepasses = [];
let activeBP        = null;   // the BP the player is competing in this session
let defaultActiveBP = null;   // the globally active BP from Supabase
let selectedBPId    = null;   // chosen on the select screen
let bpXP            = 0;

// Leaderboard state
let globalLb     = [];
let bpLb         = [];
let currentLbTab = 'global';

// Boot 
window.addEventListener('DOMContentLoaded', async () => {
  // Load solana web3
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/@solana/web3.js@1.91.1/lib/index.iife.min.js';
  document.head.appendChild(s);

  // Fetch battlepasses in background
  allBattlepasses = await fetchAllBattlepasses();
  defaultActiveBP = await fetchActiveBattlepass();
  renderConnectBPBanner(defaultActiveBP);
});

//  Auth 
function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    window.solana.connect()
      .then(resp => {
        walletAddress = resp.publicKey.toString();
        isGuest = false;
        setWalletDisplay(walletAddress);
        goToBPSelect();
      })
      .catch(err => { console.error(err); alert('Phantom connection rejected.'); });
  } else {
    alert('Phantom not detected.\nInstall from phantom.app then try again.');
  }
}

function playAsGuest() {
  walletAddress = null;
  isGuest = true;
  setWalletDisplay(null);
  goToBPSelect();
}

function goToConnect() {
  closeOverlay('o-over');
  closeOverlay('o-badge');
  closeOverlay('o-lb');
  showScreen('s-connect');
}

//  Battlepass Select 
function goToBPSelect() {
  selectedBPId = defaultActiveBP ? defaultActiveBP.id : null;
  renderBPSelectList(allBattlepasses, selectedBPId);
  showScreen('s-bp-select');
}

function selectBP(id) {
  selectedBPId = id;
  // Update card highlight
  document.querySelectorAll('.bp-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('bpcard-' + id);
  if (card) card.classList.add('selected');
}

function skipBPSelect() {
  selectedBPId = null;
  activeBP = null;
  startGame();
}

function confirmBPSelect() {
  activeBP = selectedBPId
    ? allBattlepasses.find(b => b.id === selectedBPId) || null
    : null;
  startGame();
}

//  Game start
function startGame() {
  bpXP = 0;
  level = 1;
  bestLevel = parseInt(localStorage.getItem('ttt_best') || '0');
  updateBPStrip(activeBP, bpXP);
  showScreen('s-game');
  initLevel();
}

function initLevel() {
  gameOver     = false;
  aiBlocked    = false;
  playerTurn   = true;
  movesUsed    = 0;
  movesAllowed = getMovesForLevel(level);
  board        = generatePuzzle(movesAllowed);

  renderBoard(board);
  updateStatsBar(level, movesAllowed - movesUsed, bestLevel);
  updateDiffPill(level);
  updateProgress(level);
  updateBadges(level, claimedBadges);
  renderBPTiers(activeBP, level);
  setTurnDisplay(true);
}

//  Player move 
function playerMove(index) {
  if (!playerTurn || gameOver || aiBlocked) return;
  if (board[index] !== '') return;

  board[index] = 'X';
  movesUsed++;
  renderBoard(board);
  updateStatsBar(level, movesAllowed - movesUsed, bestLevel);

  const w = checkWinner(board);
  if (w === 'X') {
    highlightWinCells(getWinPattern(board));
    setTimeout(onPlayerWin, 620);
    return;
  }

  if (movesUsed >= movesAllowed) {
    setTimeout(() => onGameOver('You used all your moves'), 400);
    return;
  }

  playerTurn = false;
  aiBlocked  = true;
  setTurnDisplay(false);
  setTimeout(runAIMove, 1100);
}

//  AI move 
function runAIMove() {
  if (gameOver) return;
  const move = getBestMoveForO(board);
  if (move === -1) { aiBlocked = false; playerTurn = true; setTurnDisplay(true); return; }

  board[move] = 'O';
  renderBoard(board);

  const w = checkWinner(board);
  if (w === 'O') {
    highlightWinCells(getWinPattern(board));
    setTimeout(() => onGameOver('Bot wins this round'), 620);
    return;
  }
  if (w === 'Draw') {
    setTimeout(() => onGameOver('Draw — board full'), 400);
    return;
  }

  aiBlocked  = false;
  playerTurn = true;
  setTurnDisplay(true);
}

// Win 
function onPlayerWin() {
  gameOver = true;
  const xpEarned = getXPForLevel(level);
  if (activeBP) { bpXP += xpEarned; updateBPStrip(activeBP, bpXP); }

  showWonPanel(movesUsed, level + 1, activeBP, xpEarned);

  setTimeout(() => {
    closeOverlay('o-won');
    level++;
    initLevel();
  }, 2400);
}

//  Game over 
function onGameOver(reason) {
  gameOver = true;
  const reached = level;

  // Update best
  if (reached > bestLevel) {
    bestLevel = reached;
    localStorage.setItem('ttt_best', bestLevel);
    if (walletAddress) saveGlobalScore(walletAddress, reached, movesUsed);
  }

  // Save BP score
  if (walletAddress && activeBP && bpXP > 0) {
    saveBPScore(activeBP.id, walletAddress, bpXP);
  }

  // Check badge
  pendingBadge = null;
  for (const [key, bd] of Object.entries(BADGE_DATA)) {
    if (reached >= bd.threshold && !claimedBadges.has(key)) { pendingBadge = key; break; }
  }

  showGameOverPanel(reached, bpXP, bestLevel, pendingBadge);
  setGameOverReason(reason);

  if (pendingBadge) setTimeout(() => showBadgePopupUI(pendingBadge, !!walletAddress), 1800);
}

function retryGame() {
  closeOverlay('o-over');
  level = 1;
  bpXP  = 0;
  updateBPStrip(activeBP, bpXP);
  initLevel();
}

//  Badge claim 
function onSkipBadge() {
  closeOverlay('o-badge');
  if (isGuest) goToConnect();
  else showOverlay('o-over');
}

async function claimBadge() {
  if (!walletAddress) { alert('Connect Phantom wallet to claim NFT badges!'); return; }
  const btn = document.getElementById('claim-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approve in Phantom...';
  try {
    const conn   = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
    const pub    = new solanaWeb3.PublicKey(walletAddress);
    const memoId = new solanaWeb3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const data   = new TextEncoder().encode(`TTT_BADGE|${pendingBadge}|${walletAddress}|${Date.now()}`);
    const tx     = new solanaWeb3.Transaction().add(
      new solanaWeb3.TransactionInstruction({ keys: [], programId: memoId, data })
    );
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash; tx.feePayer = pub;
    const signed = await window.solana.signTransaction(tx);
    await conn.sendRawTransaction(signed.serialize());
    claimedBadges.add(pendingBadge);
    updateBadges(level, claimedBadges);
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Badge Claimed!';
    setTimeout(() => closeOverlay('o-badge'), 2500);
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wallet"></i> Claim NFT via Phantom';
    console.error(e);
  }
}

//  Leaderboard 
function switchLbTab(tab) {
  currentLbTab = tab;
  document.getElementById('tab-global').classList.toggle('active', tab === 'global');
  document.getElementById('tab-bp').classList.toggle('active', tab === 'bp');
  const entries = tab === 'global' ? globalLb : bpLb;
  renderLeaderboard(entries, walletAddress, tab);
}

async function showLeaderboard() {
  [globalLb, bpLb] = await Promise.all([
    loadGlobalLeaderboard(),
    activeBP ? loadBPLeaderboard(activeBP.id) : Promise.resolve([])
  ]);

  const bpInfo = document.getElementById('lb-bp-info');
  if (activeBP) {
    bpInfo.classList.add('show');
    bpInfo.innerHTML = `<i class="fa-solid fa-fire"></i> &nbsp;<strong>${activeBP.name}</strong> — Season XP ranked`;
  } else {
    bpInfo.classList.remove('show');
  }

  renderLeaderboard(
    currentLbTab === 'global' ? globalLb : bpLb,
    walletAddress,
    currentLbTab
  );
  showOverlay('o-lb');
}