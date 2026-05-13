let dashData = null;
let mySurvivalChart = null;

async function init() {
    await loadDashboard();
    await loadMeals();
}

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
        renderChart(dashData); // Trigger the updated chart
    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

// Nutrition Circle Chart 
function renderChart(d) {
    const chartCanvas = document.getElementById('survivalChart');
    if (!chartCanvas) return;

    const carbs = d.carbs_total || 0;
    const protein = d.protein_total || 0;
    const vitamin = d.vitamin_total || 0;
    const fat = d.fat_total || 0;
    const beverage = d.beverage_total || 0;

    const ctx = chartCanvas.getContext('2d');
    
    if (mySurvivalChart) {
        mySurvivalChart.destroy();
    }

    mySurvivalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Carbs', 'Protein', 'Vitamin', 'Fat', 'Beverages'],
            datasets: [{
                data: [carbs, protein, vitamin, fat, beverage],
                backgroundColor: [
                    '#f59e0b', // Orange (Carbs)
                    '#10b981', // Green (Protein)
                    '#8b5cf6', // Purple (Vitamin)
                    '#ef4444', // Red (Fat)
                    '#3b82f6'  // Blue (Beverages)
                ],
                hoverOffset: 15,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#64748b', padding: 20, font: { size: 13, weight: 'bold' } }
                }
            },
            cutout: '75%'
        }
    });
}

function renderStats(d) {
    const remaining = d.remaining_balance;
    const days      = d.days_remaining;
    const daily     = d.daily_budget;
    const spent     = d.spent_today;
 
    document.getElementById('stat-balance').textContent = `RM ${remaining.toFixed(2)}`;
    document.getElementById('stat-balance-note').textContent = remaining < 10 ? '⚠️ Almost empty!' : '✅ Looking okay';
    document.getElementById('stat-days').textContent = days;
    document.getElementById('stat-days-note').textContent = `${days} more days to go`;
    document.getElementById('stat-daily').textContent = `RM ${daily.toFixed(2)}`;
    document.getElementById('stat-spent').textContent = `RM ${spent.toFixed(2)}`;
    document.getElementById('stat-spent-note').textContent = `RM ${(daily - spent).toFixed(2)} left today`;
}
 
function renderProgress(d) {
    const totalSpent  = d.total_spent;
    const startBal    = d.start_balance;
    const pct         = startBal > 0 ? Math.min((totalSpent / startBal) * 100, 100) : 0;
 
    document.getElementById('progress-pct').textContent    = `${Math.round(pct)}%`;
    document.getElementById('progress-fill').style.width   = `${pct}%`;
    document.getElementById('progress-spent-label').textContent = `RM ${totalSpent.toFixed(2)} spent`;
    document.getElementById('progress-left-label').textContent  = `RM ${d.remaining_balance.toFixed(2)} left`;
}
 
function renderExpenses(expenses) {
    const list = document.getElementById('expense-list');
    if (!expenses || expenses.length === 0) {
        list.innerHTML = `<div class="expense-empty">No expenses logged yet.</div>`;
        return;
    }
 
    list.innerHTML = expenses.map(e => `
        <div class="expense-item">
            <span class="expense-item-label">${escHtml(e.label)}</span>
            <span class="expense-item-amount">-RM ${parseFloat(e.amount).toFixed(2)}</span>
        </div>`).join('');
}
 
async function loadMeals() {
    try {
        const res = await fetch('/api/meals');
        const meals = await res.json();
        const list = document.getElementById('meal-list');
        list.innerHTML = meals.map(m => `
            <div class="meal-item">
                <div class="meal-item-name">${escHtml(m.name)}</div>
                <span class="meal-item-price">RM ${parseFloat(m.price).toFixed(2)}</span>
            </div>`).join('');
    } catch (e) { 
        document.getElementById('meal-list').innerHTML = `<div class="meal-empty">Couldn't load meals.</div>`;
    }
}

document.getElementById('log-btn').addEventListener('click', async () => {
    const label  = document.getElementById('log-label').value.trim();
    const amount = document.getElementById('log-amount').value;
    const msgBox = document.getElementById('log-msg');
 
    if (!label || !amount) return showMsg(msgBox, 'error', 'Fill in all fields.');
 
    try {
        const res = await fetch('/api/log_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, amount: parseFloat(amount) })
        });
        if (res.ok) {
            showMsg(msgBox, 'success', `Logged: ${label}`);
            document.getElementById('log-label').value = '';
            document.getElementById('log-amount').value = '';
            await loadDashboard();
        }
    } catch (e) { showMsg(msgBox, 'error', 'Error logging expense.'); }
});
 
function showMsg(el, type, text) {
    el.className = type;
    el.textContent = text;
    setTimeout(() => { el.className = 'hidden'; }, 4000);
}
 
function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
setInterval(loadDashboard, 30000);