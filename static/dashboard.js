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
        renderChart(dashData);
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// --- Dynamic Circle Chart with Fallback Empty State ---
function renderChart(d) {
    const chartCanvas = document.getElementById('survivalChart');
    if (!chartCanvas) return;

    if (mySurvivalChart) mySurvivalChart.destroy();

    const carbs = d.carbs_total || 0;
    const protein = d.protein_total || 0;
    const vitamin = d.vitamin_total || 0;
    const fat = d.fat_total || 0;
    const beverage = d.beverage_total || 0;

    const totalNutrition = carbs + protein + vitamin + fat + beverage;
    
    let chartData, chartColors, chartLabels;

    // Check if there is data. If total is 0, show a sleek gray placeholder circle.
    if (totalNutrition === 0) {
        chartData = [1];
        chartColors = ['#e2e8f0']; // Light gray border/circle style
        chartLabels = ['No Data Yet'];
    } else {
        chartData = [carbs, protein, vitamin, fat, beverage];
        chartColors = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6'];
        chartLabels = ['Carbs', 'Protein', 'Vitamin', 'Fat', 'Beverages'];
    }

    const ctx = chartCanvas.getContext('2d');
    mySurvivalChart = new Chart(ctx, {
        type: 'doughnut', // Generates a modern circle donut chart
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                hoverOffset: totalNutrition > 0 ? 15 : 0,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#64748b',
                        padding: 20,
                        font: { size: 12, weight: '500' },
                        // Hide the "No Data Yet" legend item so it stays ultra clean
                        filter: (item) => item.text !== 'No Data Yet'
                    }
                }
            },
            cutout: '72%' // Gives it that premium thin-ring circular look
        }
    });
}

function renderStats(d) {
    document.getElementById('stat-balance').textContent = `RM ${d.remaining_balance.toFixed(2)}`;
    document.getElementById('stat-balance-note').textContent = d.remaining_balance < 20 ? '😬 Getting low' : '✅ Looking okay';
    document.getElementById('stat-days').textContent = d.days_remaining;
    document.getElementById('stat-days-note').textContent = `${d.days_remaining} more days to go`;
    document.getElementById('stat-daily').textContent = `RM ${d.daily_budget.toFixed(2)}`;
    document.getElementById('stat-spent').textContent = `RM ${d.spent_today.toFixed(2)}`;
    const leftToday = d.daily_budget - d.spent_today;
    document.getElementById('stat-spent-note').textContent = `RM ${leftToday.toFixed(2)} left today`;
}

function renderProgress(d) {
    const pct = d.start_balance > 0 ? Math.min((d.total_spent / d.start_balance) * 100, 100) : 0;
    document.getElementById('progress-pct').textContent = `${Math.round(pct)}%`;
    const fill = document.getElementById('progress-fill');
    fill.style.width = `${pct}%`;
    fill.className = 'progress-fill' + (pct >= 85 ? ' danger' : pct >= 60 ? ' warn' : '');
    document.getElementById('progress-spent-label').textContent = `RM ${d.total_spent.toFixed(2)} spent`;
    document.getElementById('progress-left-label').textContent = `RM ${d.remaining_balance.toFixed(2)} left`;
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
                <div class="meal-item-info">
                    <div class="meal-item-name">${escHtml(m.name)}</div>
                    <div class="meal-item-stall">${escHtml(m.stall)}</div>
                </div>
                <span class="meal-item-price">RM ${parseFloat(m.price).toFixed(2)}</span>
            </div>`).join('');
    } catch (e) { console.error('Meals error'); }
}

document.getElementById('log-btn').addEventListener('click', async () => {
    const label = document.getElementById('log-label').value.trim();
    const amount = document.getElementById('log-amount').value;
    if (!label || !amount) return;
    const res = await fetch('/api/log_expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, amount: parseFloat(amount) })
    });
    if (res.ok) {
        document.getElementById('log-label').value = '';
        document.getElementById('log-amount').value = '';
        loadDashboard();
        loadMeals();
    }
});

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
setInterval(loadDashboard, 30000);