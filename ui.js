// ui.js — DOM rendering helpers

//  Screen navigation 
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showOverlay(id)  { document.getElementById(id).classList.add('show'); }
function closeOverlay(id) { document.getElementById(id).classList.remove('show'); }

//  Board 
function renderBoard(board) {
  board.forEach((val, i) => {
    const cell = document.getElementById('c' + i);
    cell.textContent = val;
    cell.className = 'cell';
    if (val === 'X') cell.classList.add('x-cell', 'taken');
    else if (val === 'O') cell.classList.add('o-cell', 'taken');
  });
}

function highlightWinCells(pattern) {
  if (!pattern) return;
  pattern.forEach(i => document.getElementById('c' + i).classList.add('win-cell'));
}

//  Stats bar 
function updateStatsBar(level, movesLeft, best) {
  document.getElementById('level-display').textContent = level;
  document.getElementById('moves-display').textContent = movesLeft;
  document.getElementById('best-display').textContent  = best;
}

//  Difficulty pill 
function updateDiffPill(level) {
  const diff = getDifficulty(level);
  const el = document.getElementById('diff-display');
  el.className = 'diff-pill ' + diff;
  el.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
}

//  Progress bar 
function updateProgress(level, maxLevel = 20) {
  const pct = Math.min(100, Math.round((level / maxLevel) * 100));
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-text').textContent = pct + '%';
}

// Turn indicator
function setTurnDisplay(isPlayer) {
  document.getElementById('turn-icon').style.color = isPlayer ? 'var(--x-col)' : 'var(--o-col)';
  document.getElementById('turn-label').textContent = isPlayer ? 'YOUR TURN — X' : 'BOT THINKING...';
}

// Badges 
const BADGE_DATA = {
  rookie:      { faIcon: 'fa-medal',        title: 'Rookie Badge',      desc: 'Reached Level 10. Your journey begins.',           threshold: 10 },
  tactician:   { faIcon: 'fa-chess-knight', title: 'Tactician Badge',   desc: 'Reached Level 15. Sharp moves, sharp mind.',       threshold: 15 },
  grandmaster: { faIcon: 'fa-crown',        title: 'Grandmaster Badge', desc: 'Reached Level 20. You have transcended the grid.', threshold: 20 }
};

function updateBadges(level, claimedBadges) {
  Object.entries(BADGE_DATA).forEach(([key, bd]) => {
    const id     = 'badge-' + key;
    const chip   = document.getElementById(id);
    const status = document.getElementById(id + '-status');
    const unlocked = level > bd.threshold || claimedBadges.has(key);
    chip.classList.toggle('unlocked', unlocked);
    status.className = claimedBadges.has(key)
      ? 'fa-solid fa-check b-status'
      : unlocked
        ? 'fa-solid fa-circle-exclamation b-status'
        : 'fa-solid fa-lock b-status';
  });
}

//  Battlepass strip (in-game) 
function updateBPStrip(activeBP, bpXP) {
  const strip = document.getElementById('bp-strip');
  if (!activeBP) { strip.classList.remove('show'); return; }
  strip.classList.add('show');
  document.getElementById('bp-strip-name').textContent = activeBP.name;
  document.getElementById('bp-strip-xp').textContent   = bpXP;
}

//  Battlepass tiers (in-game) 
function renderBPTiers(activeBP, currentLevel) {
  const row       = document.getElementById('bp-tiers-row');
  const container = document.getElementById('bp-tiers');
  const tiers     = activeBP ? (activeBP.tiers || []) : [];
  if (!activeBP || !tiers.length) { row.classList.remove('show'); return; }
  row.classList.add('show');
  container.innerHTML = tiers.map(t => {
    const reached = currentLevel >= t.level;
    return `<div class="bp-tier-chip${reached ? ' reached' : ''}">
      <div class="bp-tier-lv">Lv${t.level}</div>
      <div class="bp-tier-reward">${reached ? '<i class="fa-solid fa-check"></i> ' : ''}${t.reward}</div>
    </div>`;
  }).join('');
}

// Connect screen BP banner 
function renderConnectBPBanner(activeBP) {
  const banner = document.getElementById('connect-bp-banner');
  if (!activeBP) { banner.classList.remove('show'); return; }
  banner.classList.add('show');
  document.getElementById('connect-bp-name').textContent = activeBP.name;
  const daysLeft = Math.max(0, Math.ceil((new Date(activeBP.end_date) - Date.now()) / 86400000));
  document.getElementById('connect-bp-end').textContent   = `${daysLeft}d left`;
  document.getElementById('connect-bp-tiers').textContent = `${(activeBP.tiers||[]).length} reward tiers`;
}

// Battlepass select screen 
function renderBPSelectList(battlepasses, selectedId) {
  const container = document.getElementById('bp-select-list');
  const now = Date.now();

  if (!battlepasses.length) {
    container.innerHTML = '<div class="bp-no-results"><i class="fa-solid fa-calendar-xmark"></i> &nbsp;No battlepasses available yet.</div>';
    return;
  }

  container.innerHTML = battlepasses.map(bp => {
    const start    = new Date(bp.start_date);
    const end      = new Date(bp.end_date);
    const isActive = bp.is_active && start <= now && end >= now;
    const isUpcoming = start > now;
    const statusClass = isActive ? 'active' : isUpcoming ? 'upcoming' : 'ended';
    const statusText  = isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Ended';
    const tiers = bp.tiers || [];
    const daysLeft = isActive ? Math.ceil((end - now) / 86400000) : null;
    const selected = bp.id === selectedId;

    return `<div class="bp-card${selected ? ' selected' : ''}" onclick="selectBP('${bp.id}')" id="bpcard-${bp.id}">
      <div class="bp-card-top">
        <div class="bp-card-name">${bp.name}</div>
        <div class="bp-status-pill ${statusClass}">${statusText}</div>
      </div>
      <div class="bp-card-meta">
        <span><i class="fa-regular fa-calendar"></i> ${start.toLocaleDateString()} — ${end.toLocaleDateString()}</span>
        <span><i class="fa-solid fa-layer-group"></i> ${tiers.length} tier${tiers.length !== 1 ? 's' : ''}</span>
        ${daysLeft !== null ? `<span style="color:var(--win-col)"><i class="fa-solid fa-clock"></i> ${daysLeft}d left</span>` : ''}
      </div>
      ${tiers.length ? `<div class="bp-card-tiers">
        ${tiers.slice(0, 4).map(t => `<div class="bp-tier-mini">Lv${t.level} — ${t.reward}</div>`).join('')}
        ${tiers.length > 4 ? `<div class="bp-tier-mini">+${tiers.length - 4} more</div>` : ''}
      </div>` : ''}
    </div>`;
  }).join('');
}

// Leaderboard 
function renderLeaderboard(entries, walletAddress, mode = 'global') {
  const list = document.getElementById('lb-list');
  const rankIcons = ['fa-trophy', 'fa-medal', 'fa-award'];

  if (!entries.length) {
    list.innerHTML = '<div class="lb-empty"><i class="fa-solid fa-ghost"></i> No scores yet.</div>';
    return;
  }

  list.innerHTML = entries.slice(0, 10).map((e, i) => {
    const addr  = mode === 'global' ? (e.addr || e.wallet || '') : (e.wallet || '');
    const isMe  = addr === walletAddress;
    const short = addr.length > 8 ? addr.slice(0,4) + '..' + addr.slice(-4) : addr;
    const rankHtml = i < 3 ? `<i class="fa-solid ${rankIcons[i]}"></i>` : `#${i+1}`;
    const mainVal  = mode === 'global' ? `Lv${e.level || e.best_level}` : `${e.xp} XP`;
    const subVal   = mode === 'global' ? `${e.moves || e.best_moves}mv` : '&nbsp;';

    return `<div class="lb-entry${isMe ? ' me' : ''}">
      <div class="lb-rank${i < 3 ? ' r' + (i+1) : ''}">${rankHtml}</div>
      <div class="lb-addr">${short}${isMe ? '<span class="you-tag">YOU</span>' : ''}<small>${mode === 'global' ? 'Level reached' : 'Season XP'}</small></div>
      <div class="lb-lv">${mainVal}</div>
      <div class="lb-mv">${subVal}</div>
    </div>`;
  }).join('');
}

//  Game over panel
function showGameOverPanel(level, xp, best, pendingBadge) {
  document.getElementById('over-reason').textContent = '';
  document.getElementById('os-level').textContent    = level;
  document.getElementById('os-xp').textContent       = xp;
  document.getElementById('os-best').textContent     = best;

  const notice = document.getElementById('badge-unlock-notice');
  if (pendingBadge) {
    notice.style.display = 'block';
    notice.innerHTML = `<i class="fa-solid fa-award"></i> &nbsp;${BADGE_DATA[pendingBadge].title} unlocked!`;
  } else {
    notice.style.display = 'none';
  }
  showOverlay('o-over');
}

function setGameOverReason(reason) {
  document.getElementById('over-reason').textContent = reason;
}

//  Badge popup 
function showBadgePopupUI(badgeKey, hasWallet) {
  const d = BADGE_DATA[badgeKey];
  document.getElementById('badge-fa-icon').className = `fa-solid ${d.faIcon}`;
  document.getElementById('badge-title').textContent = d.title;
  document.getElementById('badge-desc').textContent  = d.desc;
  const btn = document.getElementById('claim-btn');
  btn.disabled = false;
  btn.innerHTML = `<i class="fa-solid fa-wallet"></i> ${hasWallet ? 'Claim NFT via Phantom' : 'Connect Wallet to Claim'}`;
  showOverlay('o-badge');
}

//  Won panel 
function showWonPanel(movesUsed, nextLevel, activeBP, xpEarned) {
  const xpEl = document.getElementById('xp-award-won');
  if (activeBP) {
    xpEl.style.display = 'block';
    xpEl.textContent   = `+${xpEarned} XP earned`;
  } else {
    xpEl.style.display = 'none';
  }
  document.getElementById('won-sub').textContent =
    `Won in ${movesUsed} move${movesUsed !== 1 ? 's' : ''}. Loading level ${nextLevel}...`;
  showOverlay('o-won');
}

//  Wallet chip 
function setWalletDisplay(walletAddress) {
  document.getElementById('wallet-display').textContent = walletAddress
    ? walletAddress.slice(0,4) + '..' + walletAddress.slice(-4)
    : 'Guest';
}