// config.js — Supabase credentials

const SUPABASE_URL = 'https://cpcozalqivxfwprzashq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q_Hmt3--29wCtHh0MsWSlg_XzSr5KkY';

//  Generic fetch wrapper
async function sbFetch(path, opts = {}) {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('Supabase not configured — skipping network call');
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        'apikey':          SUPABASE_KEY,
        'Authorization':   `Bearer ${SUPABASE_KEY}`,
        'Content-Type':    'application/json',
        'Prefer':          opts.prefer || 'return=representation',
        ...(opts.headers || {})
      },
      method: opts.method || 'GET',
      body:   opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      console.error('Supabase error', res.status, await res.text());
      return null;
    }
    return res.json().catch(() => null);
  } catch (e) {
    console.error('Network error', e);
    return null;
  }
}

async function fetchAllBattlepasses() {
  const now = new Date().toISOString();
  return await sbFetch(
    `battlepasses?is_active=eq.true&start_date=lte.${now}&end_date=gte.${now}&order=end_date.asc`
  ) || [];
}

async function fetchActiveBattlepass() {
  const now = new Date().toISOString();
  const data = await sbFetch(
    `battlepasses?is_active=eq.true&start_date=lte.${now}&end_date=gte.${now}&order=end_date.asc&limit=1`
  );
  return data && data.length ? data[0] : null;
}

// Scores 
async function saveGlobalScore(wallet, level, moves) {
  if (!wallet) return;
  return await sbFetch('global_scores', {
    method:  'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: { wallet, best_level: level, best_moves: moves, updated_at: new Date().toISOString() }
  });
}

async function saveBPScore(bpId, wallet, xp) {
  if (!wallet || !bpId) return;
  return await sbFetch('bp_scores', {
    method:  'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: { battlepass_id: bpId, wallet, xp, updated_at: new Date().toISOString() }
  });
}

async function loadGlobalLeaderboard() {
  const data = await sbFetch('global_scores?order=best_level.desc,best_moves.asc&limit=50');
  return (data || []).map(r => ({ addr: r.wallet, level: r.best_level, moves: r.best_moves }));
}

async function loadBPLeaderboard(bpId) {
  if (!bpId) return [];
  const data = await sbFetch(`bp_scores?battlepass_id=eq.${bpId}&order=xp.desc,updated_at.asc&limit=50`);
  return data || [];
}
