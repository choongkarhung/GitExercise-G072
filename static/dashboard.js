let dashData = null;

async function init() {
    await loadDashboard();
    await loadMeals();
    await loadCalorieWidget();  
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

    document.getElementById('stat-balance').textContent = `RM ${remaining.toFixed(2)}`;
    const balNote = remaining < 10
        ? 'Almost empty!'
        : remaining < 30
            ? 'Getting low'
            : 'Looking okay';
    document.getElementById('stat-balance-note').textContent = balNote;

    document.getElementById('stat-days').textContent = days;
    document.getElementById('stat-days-note').textContent =
        days === 1 ? 'Last day — hang in there!'
        : days === 0 ? 'Payday today!'
        : `${days} more days to go`;

    document.getElementById('stat-daily').textContent = `RM ${daily.toFixed(2)}`;
    const dailyNote = daily < 5
        ? 'Very tight'
        : daily < 10
            ? 'Budget meals only'
            : 'Not bad!';
    document.getElementById('stat-daily-note').textContent = dailyNote;

    document.getElementById('stat-spent').textContent = `RM ${spent.toFixed(2)}`;
    const leftToday = daily - spent;
    document.getElementById('stat-spent-note').textContent =
        leftToday < 0
            ? `RM ${Math.abs(leftToday).toFixed(2)} over budget!`
            : `RM ${leftToday.toFixed(2)} left today`;
}

// PROGRESS BAR
function renderProgress(d) {
    const totalSpent = d.total_spent;
    const startBal   = d.start_balance;
    const remaining  = d.remaining_balance;
    const pct        = startBal > 0 ? Math.min((totalSpent / startBal) * 100, 100) : 0;

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
        // Show calorie badge if the logged entry has calories (from meal plan)
        const calBadge = e.calories > 0
            ? `<span class="cal-badge">${e.calories} kcal</span>`
            : '';
        return `
        <div class="expense-item">
            <div class="expense-item-left">
                <span class="expense-item-label">${escHtml(e.label)}</span>
                <div class="expense-item-meta">
                    <span class="expense-item-time">${time}</span>
                    ${calBadge}
                </div>
            </div>
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
    const dailyLimit = dashData.daily_budget - dashData.spent_today;

    list.innerHTML = meals.map(m => {
        const isLuxury = m.price > (dailyLimit * 0.7);
        const tag = isLuxury ? '<span class="status-badge status-warn">Top Choice</span>' : '';
        // Show calorie count if available
        const calStr = m.calories > 0 ? `${m.calories} kcal` : '';

        return `
        <div class="meal-item">
            <div class="meal-item-info">
                <div class="meal-item-name">${escHtml(m.name)} ${tag}</div>
                <div class="meal-item-stall">${escHtml(m.stall)}</div>
            </div>
            <div class="meal-item-right">
                ${calStr ? `<span class="meal-kcal">${calStr}</span>` : ''}
                <span class="meal-item-price">RM ${parseFloat(m.price).toFixed(2)}</span>
            </div>
        </div>`;
    }).join('');
}

// CALORIE WIDGET 
async function loadCalorieWidget() {
    try {
        const res = await fetch('/api/calorie_today');
        if (!res.ok) return;
        const data = await res.json();

        if (!data.has_profile) {
            // Show a gentle CTA to set up their calorie profile
            document.getElementById('calorie-cta').style.display = 'flex';
            return;
        }

        renderCalorieWidget(data);
        document.getElementById('calorie-widget').style.display = 'block';
    } catch (e) {
        // Silently ignore — calorie widget is optional
        console.warn('Calorie widget load failed:', e);
    }
}

function renderCalorieWidget(data) {
    const target    = data.target_calories;
    const consumed  = data.calories_today;
    const remaining = Math.max(target - consumed, 0);
    const pct       = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

    // Goal mode badge
    const modeMap = {
        deficit:  { label: '🔥 Cutting',      cls: 'cw-badge-deficit'  },
        surplus:  { label: '💪 Bulking',       cls: 'cw-badge-surplus'  },
        maintain: { label: '⚖️ Maintaining', cls: 'cw-badge-maintain' },
    };
    const mode = modeMap[data.goal_mode] || modeMap.maintain;
    const badge = document.getElementById('cw-mode-badge');
    badge.textContent = mode.label;
    badge.className   = `cw-mode-badge ${mode.cls}`;

    document.getElementById('cw-consumed').textContent  = consumed.toLocaleString();
    document.getElementById('cw-target').textContent    = target.toLocaleString();
    document.getElementById('cw-remaining').textContent = remaining > 0
        ? `${remaining.toLocaleString()} kcal left`
        : consumed > target
            ? `${(consumed - target).toLocaleString()} kcal over`
            : 'Goal reached! 🎉';

    // Progress bar
    const fill = document.getElementById('cw-fill');
    fill.style.width = `${pct}%`;
    fill.className = 'cw-bar-fill';
    if (pct >= 100) fill.classList.add('cw-fill-over');
    else if (pct >= 80) fill.classList.add('cw-fill-warn');

    // Footer labels
    document.getElementById('cw-pct-label').textContent = `${Math.round(pct)}% of daily goal`;

    let statusText = '';
    if (pct >= 100)      statusText = '🔴 Over target for today';
    else if (pct >= 80)  statusText = '⚠️ Nearly at your limit';
    else if (pct >= 50)  statusText = '✅ On track';
    else if (consumed === 0) statusText = '💡 Log meals from Meal Plan to track';
    else                 statusText = '👍 Good pace';
    document.getElementById('cw-status-label').textContent = statusText;
}

// LOG EXPENSE
document.getElementById('log-btn').addEventListener('click', async () => {
    const label    = document.getElementById('log-label').value.trim();
    const amount   = document.getElementById('log-amount').value;
    const calories = parseInt(document.getElementById('log-calories').value) || 0;
    const msgBox = document.getElementById('log-msg');

    if (!label) return showMsg(msgBox, 'error', 'Please enter a description.');
    if (!amount || parseFloat(amount) <= 0) return showMsg(msgBox, 'error', 'Enter a valid amount.');

    try {
        const res = await fetch('/api/log_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, amount: parseFloat(amount), calories })
        });
        const data = await res.json();

        if (res.ok) {
            showMsg(msgBox, 'success', `Logged: ${label} (RM ${parseFloat(amount).toFixed(2)})`);
            document.getElementById('log-label').value    = '';
            document.getElementById('log-amount').value   = '';
            document.getElementById('log-calories').value = '';
            await loadDashboard();
            await loadMeals();
            await loadCalorieWidget();   // Refresh calorie widget too
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

async function refreshDashboard() {
    await loadDashboard();
    await loadMeals();
    await loadCalorieWidget();
}

// START
init();

// AUTO-UPDATE every 30 seconds
setInterval(refreshDashboard, 30000);