/* ═══════════════════════════════════════════
   BrokeBite — dashboard.js
   Handles: stats, expense logging, meal picks
   ═══════════════════════════════════════════ */

// ── MEAL DATABASE ──────────────────────────────────────────
const MEALS = [
    { name: "Nasi Lemak",         emoji: "🍛", price: 2.50,  desc: "Classic coconut rice with sambal, egg & peanuts." },
    { name: "Roti Canai",         emoji: "🫓", price: 1.50,  desc: "Crispy flatbread with dhal. Best morning fuel." },
    { name: "Mee Goreng",         emoji: "🍜", price: 4.00,  desc: "Fried noodles, spicy, filling, and everywhere." },
    { name: "Nasi Goreng",        emoji: "🍚", price: 4.50,  desc: "Fried rice with egg — the reliable classic." },
    { name: "Char Kuey Teow",     emoji: "🥘", price: 5.00,  desc: "Wok-fried flat noodles, smoky and satisfying." },
    { name: "Bak Kut Teh",        emoji: "🍲", price: 7.00,  desc: "Pork rib herb soup. Comfort in a bowl." },
    { name: "Economy Rice",       emoji: "🍱", price: 3.50,  desc: "Pick your lauk, keep it cheap & balanced." },
    { name: "Teh Tarik",          emoji: "🧋", price: 1.80,  desc: "Frothy pulled tea. Pair with any meal." },
    { name: "Banana Leaf Rice",   emoji: "🌿", price: 6.00,  desc: "Southern Indian feast served on banana leaf." },
    { name: "Laksa",              emoji: "🍥", price: 5.50,  desc: "Spicy coconut noodle soup that hits different." },
    { name: "Wantan Mee",         emoji: "🍝", price: 4.00,  desc: "Springy noodles with char siu and wontons." },
    { name: "Cendol",             emoji: "🍨", price: 2.50,  desc: "Sweet iced dessert. A cheap treat after lunch." },
    { name: "Cucur Udang",        emoji: "🧆", price: 2.00,  desc: "Crispy prawn fritters. Snack or full meal." },
    { name: "Kuih",               emoji: "🟢", price: 0.50,  desc: "Traditional Malay sweets — get a few for under RM2." },
    { name: "Toast & Eggs",       emoji: "🍳", price: 3.00,  desc: "Kopitiam toast set. Old school, unbeatable value." },
    { name: "Pisang Goreng",      emoji: "🍌", price: 1.00,  desc: "Fried banana fritters. Warm, crispy, cheap." },
    { name: "Popiah",             emoji: "🌯", price: 2.00,  desc: "Fresh spring roll with jicama, egg, and sauce." },
    { name: "Fried Rice + Egg",   emoji: "🍳", price: 3.50,  desc: "Mamak-style. Always reliable, always hits." },
    { name: "Maggi Goreng",       emoji: "🍜", price: 3.50,  desc: "Instant noodle stir-fried mamak style. A classic." },
    { name: "Apam Balik",         emoji: "🥞", price: 2.00,  desc: "Crispy peanut pancake turnover. Afternoon snack." },
];

// ── STATE ──────────────────────────────────────────────────
let state = {
    balance: 0,
    initialBalance: 0,
    days: 1,
    dailyBudget: 0,
    expenses: [],          // { id, name, amount, category, time }
    selectedCat: '🍚 Food',
    mealPool: [],
};

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadFromServer();
    loadExpensesFromStorage();
    render();
    animateProgressBars();
    renderMeals();
    bindEvents();
});

async function loadFromServer() {
    try {
        const res = await fetch('/api/user-data');
        if (!res.ok) { window.location.href = '/setup'; return; }
        const data = await res.json();
        state.balance        = data.balance;
        state.initialBalance = data.initial_balance ?? data.balance;
        state.days           = data.days;
        state.dailyBudget    = parseFloat((data.balance / data.days).toFixed(2));
    } catch {
        // Fallback: show setup page if no data
        window.location.href = '/setup';
    }
}

function loadExpensesFromStorage() {
    const today = new Date().toDateString();
    const raw   = localStorage.getItem('brokebite_expenses');
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        // Only keep today's expenses
        state.expenses = (parsed.date === today ? parsed.items : []);
    } catch { state.expenses = []; }
}

function saveExpenses() {
    const today = new Date().toDateString();
    localStorage.setItem('brokebite_expenses', JSON.stringify({
        date:  today,
        items: state.expenses,
    }));
}

// ── COMPUTED ───────────────────────────────────────────────
function todaySpent() {
    return state.expenses.reduce((s, e) => s + e.amount, 0);
}

function todayRemaining() {
    return Math.max(0, state.dailyBudget - todaySpent());
}

function currentBalance() {
    return Math.max(0, state.balance - todaySpent());
}

// ── RENDER ─────────────────────────────────────────────────
function render() {
    const balance   = currentBalance();
    const spent     = todaySpent();
    const remaining = todayRemaining();
    const pct       = state.initialBalance > 0
        ? Math.min(100, Math.round((balance / state.initialBalance) * 100))
        : 100;

    // Stat cards
    setText('stat-balance', balance.toFixed(2));
    setText('stat-days',    state.days);
    setText('stat-daily',   state.dailyBudget.toFixed(2));
    setText('stat-days-sub', state.days === 1 ? 'last day!' : 'days to go');

    // Budget card colour
    const budgetCard = document.getElementById('budget-card');
    if (remaining <= 0) {
        budgetCard.className = 'stat-card red';
        setText('budget-status', 'overspent today 😬');
    } else if (remaining < state.dailyBudget * 0.3) {
        budgetCard.className = 'stat-card yellow';
        setText('budget-status', 'almost out for today');
    } else {
        budgetCard.className = 'stat-card green';
        setText('budget-status', 'per day remaining');
    }

    // Progress bar
    setText('balance-pct', pct + '%');
    setText('balance-bar-label', 'RM ' + state.initialBalance.toFixed(2));
    const bar = document.getElementById('balance-bar');
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' +
        (pct < 25 ? ' danger' : pct < 50 ? ' warning' : '');

    // Alert banner
    const alert = document.getElementById('alert-banner');
    if (balance <= 5) {
        alert.style.display = 'flex';
        alert.className = 'alert-banner danger';
        alert.innerHTML = '🚨 <strong>Critical:</strong> RM ' + balance.toFixed(2) + ' left. Survival mode activated.';
    } else if (balance < state.dailyBudget) {
        alert.style.display = 'flex';
        alert.className = 'alert-banner warning';
        alert.innerHTML = '⚠️ <strong>Watch out!</strong> Your balance is lower than one day\'s budget.';
    } else {
        alert.style.display = 'none';
    }

    // Budget ring
    const ringBudget = state.dailyBudget;
    const ringLeft   = todayRemaining();
    const ringPct    = ringBudget > 0 ? Math.min(1, ringLeft / ringBudget) : 0;
    const circumference = 175.9;
    const offset = circumference - ringPct * circumference;
    const circle = document.getElementById('ring-circle');
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = ringPct < 0.25 ? '#c0615c' : ringPct < 0.5 ? '#c9a84c' : 'var(--green)';

    setText('ring-left',   ringLeft.toFixed(2));
    setText('ring-budget', ringBudget.toFixed(2));

    const tag = document.getElementById('ring-tag');
    if (spent === 0) {
        tag.className = 'safe-tag'; tag.textContent = 'Nothing spent yet ✓';
    } else if (ringPct <= 0) {
        tag.className = 'spent-tag'; tag.textContent = 'Over budget today ✗';
    } else if (ringPct < 0.3) {
        tag.className = 'spent-tag'; tag.textContent = 'Almost out!';
    } else {
        tag.className = 'safe-tag'; tag.textContent = 'On track ✓';
    }

    // Today total
    setText('today-total', spent.toFixed(2));

    // Expense list
    renderExpenses();
}

function renderExpenses() {
    const list = document.getElementById('expense-list');
    if (state.expenses.length === 0) {
        list.innerHTML = `<div class="empty-state"><span class="icon">🧾</span>No expenses yet.<br>Stay strong!</div>`;
        return;
    }
    list.innerHTML = [...state.expenses].reverse().map(e => `
        <div class="expense-item" data-id="${e.id}">
            <span class="expense-emoji">${categoryEmoji(e.category)}</span>
            <div class="expense-info">
                <div class="expense-name">${escHtml(e.name || e.category)}</div>
                <div class="expense-meta">${e.category} · ${e.time}</div>
            </div>
            <span class="expense-amount">−RM ${e.amount.toFixed(2)}</span>
            <button class="expense-delete" title="Remove" onclick="deleteExpense('${e.id}')">✕</button>
        </div>
    `).join('');
}

// ── MEAL SUGGESTIONS ───────────────────────────────────────
function renderMeals() {
    const budget  = todayRemaining();
    const affordable = MEALS.filter(m => m.price <= budget);
    const pool    = affordable.length >= 3 ? affordable : MEALS.slice().sort((a,b) => a.price - b.price);
    const picks   = shuffle(pool).slice(0, 3);
    state.mealPool = picks;

    const list = document.getElementById('meal-list');
    if (picks.length === 0) {
        list.innerHTML = `<div class="empty-state" style="margin-bottom:12px;"><span class="icon">😬</span>Budget's really tight.<br>Maybe water today?</div>`;
        return;
    }
    list.innerHTML = picks.map(m => `
        <div class="meal-card">
            <span class="meal-emoji">${m.emoji}</span>
            <div class="meal-info">
                <div class="meal-name">${m.name}</div>
                <div class="meal-desc">${m.desc}</div>
            </div>
            <span class="meal-price">RM ${m.price.toFixed(2)}</span>
        </div>
    `).join('');
}

// ── EVENTS ─────────────────────────────────────────────────
function bindEvents() {
    // Category chips
    document.getElementById('cat-chips').addEventListener('click', e => {
        const chip = e.target.closest('.cat-chip');
        if (!chip) return;
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedCat = chip.dataset.cat;
    });

    // Log expense
    document.getElementById('log-btn').addEventListener('click', logExpense);

    // Enter key on inputs
    ['spend-name', 'spend-amount'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') logExpense();
        });
    });

    // Meal refresh
    document.getElementById('meal-refresh').addEventListener('click', renderMeals);
}

function logExpense() {
    const nameEl   = document.getElementById('spend-name');
    const amountEl = document.getElementById('spend-amount');
    const amount   = parseFloat(amountEl.value);

    if (!amount || amount <= 0) {
        amountEl.focus();
        shake(amountEl);
        return;
    }

    const expense = {
        id:       Math.random().toString(36).slice(2),
        name:     nameEl.value.trim() || state.selectedCat,
        amount:   amount,
        category: state.selectedCat,
        time:     new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
    };

    state.expenses.push(expense);
    saveExpenses();

    // Sync balance to server
    syncBalance(currentBalance());

    nameEl.value   = '';
    amountEl.value = '';
    render();
    renderMeals();
}

function deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveExpenses();
    syncBalance(currentBalance());
    render();
    renderMeals();
}

async function syncBalance(newBalance) {
    try {
        await fetch('/api/update-balance', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ balance: newBalance }),
        });
    } catch { /* silent fail — localStorage is source of truth for expenses */ }
}

// ── HELPERS ────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function categoryEmoji(cat) {
    const map = {
        '🍚 Food': '🍚', '🚌 Transport': '🚌',
        '🛒 Groceries': '🛒', '☕ Coffee': '☕',
        '💊 Health': '💊', '📦 Other': '📦',
    };
    return map[cat] || '📦';
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.3s ease';
    setTimeout(() => { el.style.animation = ''; }, 350);
}

function animateProgressBars() {
    // Trigger bar animation after paint
    requestAnimationFrame(() => {
        const pct = state.initialBalance > 0
            ? Math.min(100, Math.round((currentBalance() / state.initialBalance) * 100))
            : 100;
        document.getElementById('balance-bar').style.width = pct + '%';
    });
}

// Shake keyframe (injected once)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-5px); }
    40%      { transform: translateX(5px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);