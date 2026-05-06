// ══════════════════════════════════════
//   BrokeBite — Dashboard JS
// ══════════════════════════════════════

let dashData = null; // cached from /api/dashboard

// ── INIT ──────────────────────────────
async function init() {
    await loadDashboard();
    await loadMeals();
}

// ── LOAD DASHBOARD DATA ───────────────
async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) {
            if (res.status === 401) { window.location.href = '/'; return; }
            throw new Error('Failed to load');
        }
        dashData = await res.json();
        renderStats(dashData);
        renderProgress(dashData);
        renderExpenses(dashData.expenses_today);
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

// ENDER STAT CARDS
function renderStats(d) {
    const remaining = d.remaining_balance;
    const days      = d.days_remaining;
    const daily     = d.daily_budget;
    const spent     = d.spent_today;
 
    // Balance
    document.getElementById('stat-balance').textContent = `RM ${remaining.toFixed(2)}`;
    const balNote = remaining < 10
        ? '⚠️ Almost empty!'
        : remaining < 30
            ? '😬 Getting low'
            : '✅ Looking okay';
    document.getElementById('stat-balance-note').textContent = balNote;
 
    // Days
    document.getElementById('stat-days').textContent = days;
    document.getElementById('stat-days-note').textContent =
        days === 1 ? 'Last day — hang in there!'
        : days === 0 ? 'Payday today! 🎉'
        : `${days} more days to go`;
 
    // Daily budget
    document.getElementById('stat-daily').textContent = `RM ${daily.toFixed(2)}`;
    const dailyNote = daily < 5
        ? '😬 Very tight'
        : daily < 10
            ? '🍜 Budget meals only'
            : '😊 Not bad!';
    document.getElementById('stat-daily-note').textContent = dailyNote;
 
    // Spent today
    document.getElementById('stat-spent').textContent = `RM ${spent.toFixed(2)}`;
    const leftToday = daily - spent;
    document.getElementById('stat-spent-note').textContent =
        leftToday < 0
            ? `⚠️ RM ${Math.abs(leftToday).toFixed(2)} over budget!`
            : `RM ${leftToday.toFixed(2)} left today`;
}
 