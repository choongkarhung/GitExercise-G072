let dashData = null;

async function init() {
    await loadDashboard();
    await loadMeals();
}

// LOAD DASHBOARD DATA 
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

// STAT CARDS
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
 
// PROGRESS BAR 
function renderProgress(d) {
    const totalSpent  = d.total_spent;
    const startBal    = d.start_balance;
    const remaining   = d.remaining_balance;
    const pct         = startBal > 0 ? Math.min((totalSpent / startBal) * 100, 100) : 0;
 
    document.getElementById('progress-pct').textContent    = `${Math.round(pct)}%`;
    document.getElementById('progress-fill').style.width   = `${pct}%`;
    document.getElementById('progress-spent-label').textContent = `RM ${totalSpent.toFixed(2)} spent`;
    document.getElementById('progress-left-label').textContent  = `RM ${remaining.toFixed(2)} left`;
 
    const fill = document.getElementById('progress-fill');
    fill.classList.remove('warn', 'danger');
    if (pct >= 85) fill.classList.add('danger');
    else if (pct >= 60) fill.classList.add('warn');
}
 
// EXPENSE LIST 
function renderExpenses(expenses) {
    const list = document.getElementById('expense-list');
 
    if (!expenses || expenses.length === 0) {
        list.innerHTML = `<div class="expense-empty">No expenses logged yet.<br>Start tracking above! 👆</div>`;
        return;
    }
 
    list.innerHTML = expenses.map(e => {
        const time = new Date(e.logged_at).toLocaleTimeString('en-MY', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        return `
        <div class="expense-item">
            <span class="expense-item-label">${escHtml(e.label)}</span>
            <span class="expense-item-time">${time}</span>
            <span class="expense-item-amount">-RM ${parseFloat(e.amount).toFixed(2)}</span>
        </div>`;
    }).join('');
}
 
// MEAL SUGGESTIONS
async function loadMeals() {
    try {
        const res = await fetch('/api/meals');
        if (!res.ok) throw new Error('Meals load failed');
        const meals = await res.json();
        renderMeals(meals);
    } catch (e) {
        document.getElementById('meal-list').innerHTML =
            `<div class="meal-empty">Couldn't load meals.</div>`;
    }
}

function renderMeals(meals) {
    const list = document.getElementById('meal-list');
    if (!meals || meals.length === 0) {
        list.innerHTML = `<div class="meal-empty">No meals fit your budget.<br>Hang tight 😬</div>`;
        return;
    }
    list.innerHTML = meals.map(m => `
        <div class="meal-item">
            <div class="meal-item-info">
                <div class="meal-item-name">${escHtml(m.name)}</div>
                <div class="meal-item-stall">${escHtml(m.stall)}</div>
            </div>
            <span class="meal-item-price">RM ${parseFloat(m.price).toFixed(2)}</span>
        </div>
    `).join('');
}

// LOG EXPENSE
document.getElementById('log-btn').addEventListener('click', async () => {
    const label  = document.getElementById('log-label').value.trim();
    const amount = document.getElementById('log-amount').value;
    const msgBox = document.getElementById('log-msg');
 
    if (!label) return showMsg(msgBox, 'error', 'Please enter a description.');
    if (!amount || parseFloat(amount) <= 0) return showMsg(msgBox, 'error', 'Enter a valid amount.');
 
    try {
        const res = await fetch('/api/log_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, amount: parseFloat(amount) })
        });
        const data = await res.json();
 
        if (res.ok) {
            showMsg(msgBox, 'success', `Logged: ${label} (RM ${parseFloat(amount).toFixed(2)})`);
            document.getElementById('log-label').value  = '';
            document.getElementById('log-amount').value = '';
            // Refresh dashboard data
            await loadDashboard();
            await loadMeals(); // Budget may have changed
        } else {
            showMsg(msgBox, 'error', data.error || 'Something went wrong.');
        }
    } catch (e) {
        showMsg(msgBox, 'error', 'Network error.');
    }
});
 
// HELPERS 
function showMsg(el, type, text) {
    el.className = type;
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.className = 'hidden';
    }, 4000);
}
 
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
 
// Function to refresh all dashboard data
async function refreshDashboard() {
    console.log('Auto-refreshing dashboard data...');
    await loadDashboard();
    await loadMeals();
}

// START 
init();

// AUTO-UPDATE: Run refreshEvery 30 seconds 
setInterval(refreshDashboard, 30000);