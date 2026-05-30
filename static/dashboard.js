let dashData = null;

async function init() {
    try { await loadDashboard(); } catch(err) { console.error(err); }
    try { await loadMeals(); } catch(err) { console.error(err); }
    try { await loadCalorieWidget(); } catch(err) { console.error(err); }
    setupEventListeners();
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
        
        // Build the multi-colored circle chart layout
        buildProgressChart(dashData);
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

    if(document.getElementById('stat-balance')) {
        document.getElementById('stat-balance').textContent = `RM ${remaining.toFixed(2)}`;
    }
    if(document.getElementById('stat-days')) {
        document.getElementById('stat-days').textContent = days;
    }
    if(document.getElementById('stat-daily')) {
        document.getElementById('stat-daily').textContent = `RM ${daily.toFixed(2)}`;
    }
    if(document.getElementById('stat-spent')) {
        document.getElementById('stat-spent').textContent = `RM ${spent.toFixed(2)}`;
    }
}

// FINANCIAL PROGRESS LINEAR TRACK
function renderProgress(d) {
    const totalSpent = d.total_spent;
    const startBal   = d.start_balance;
    const remaining  = d.remaining_balance;
    const pct        = startBal > 0 ? Math.min((totalSpent / startBal) * 100, 100) : 0;

    if (document.getElementById('progress-pct')) document.getElementById('progress-pct').textContent = `${Math.round(pct)}%`;
    if (document.getElementById('progress-fill')) {
        document.getElementById('progress-fill').style.width = `${pct}%`;
    }
    if (document.getElementById('progress-spent-label')) document.getElementById('progress-spent-label').textContent = `RM ${totalSpent.toFixed(2)} spent`;
    if (document.getElementById('progress-left-label')) document.getElementById('progress-left-label').textContent = `RM ${remaining.toFixed(2)} left`;
}

// MULTI-COLORED BREAKDOWN DONUT CHART
function buildProgressChart(dataObj) {
    const chartCanvas = document.getElementById("progressChart");
    if (!chartCanvas) return;

    const ctx = chartCanvas.getContext("2d");

    let carb = 0, protein = 0, vitamin = 0, fat = 0, beverages = 0;

    // Tally up items directly from today's expenses array
    const expenses = dataObj.expenses_today || [];
    expenses.forEach(e => {
        const cat = e.category ? e.category.trim().toLowerCase() : '';
        const amt = parseFloat(e.amount) || 0;
        
        if (cat === 'carb' || cat === 'carbs') carb += amt;
        else if (cat === 'protein') protein += amt;
        else if (cat === 'vitamin' || cat === 'vitamins') vitamin += amt;
        else if (cat === 'fat' || cat === 'fats') fat += amt;
        else if (cat === 'beverages' || cat === 'beverage') beverages += amt;
    });

    const totalMacros = carb + protein + vitamin + fat + beverages;
    
    let chartData = [carb, protein, vitamin, fat, beverages];
    let chartColors = ["#e67e22", "#2ecc71", "#f1c40f", "#e74c3c", "#3498db"];
    let chartLabels = ["Carb", "Protein", "Vitamin", "Fat", "Beverages"];

    // If completely empty, show all 5 colors equally
    if (totalMacros === 0) {
        chartData = [1, 1, 1, 1, 1];
    }

    if (window.myProgressChart) {
        window.myProgressChart.destroy();
    }

    window.myProgressChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: "bottom",
                    labels: { boxWidth: 12, font: { size: 11, weight: '500' } }
                }
            },
            cutout: "70%"
        }
    });
}

// EXPENSE LIST
function renderExpenses(expenses) {
    const list = document.getElementById('expense-list');
    if (!list) return;

    if (!expenses || expenses.length === 0) {
        list.innerHTML = `<div class="expense-empty">No expenses logged yet.<br>Start tracking above! 👆</div>`;
        return;
    }

    list.innerHTML = expenses.map(e => {
        const time = new Date(e.logged_at).toLocaleTimeString('en-MY', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        const calBadge = e.calories > 0 ? `<span class="cal-badge">${e.calories} kcal</span>` : '';
        
        // Removed the inner category tag badge entirely from HTML string assembly
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

// MEAL SUGGESTIONS & CALORIE CODES
async function loadMeals() { try { const res = await fetch('/api/meals'); if (!res.ok) throw new Error(); const meals = await res.json(); renderMeals(meals); } catch (e) {} }
function renderMeals(meals) { const list = document.getElementById('meal-list'); if (!list) return; list.innerHTML = meals.map(m => `<div class="meal-item"><div class="meal-item-name">${escHtml(m.name)}</div><span class="meal-item-price">RM ${parseFloat(m.price).toFixed(2)}</span></div>`).join(''); }
async function loadCalorieWidget() { try { const res = await fetch('/api/calorie_today'); if (!res.ok) return; const data = await res.json(); if (data.has_profile) { document.getElementById('calorie-widget').style.display = 'block'; } } catch (e) {} }

function setupEventListeners() {
    const logBtn = document.getElementById('log-btn');
    if (logBtn) {
        logBtn.replaceWith(logBtn.cloneNode(true)); 
        document.getElementById('log-btn').addEventListener('click', async () => {
            const label    = document.getElementById('log-label').value.trim();
            const amount   = document.getElementById('log-amount').value;
            const calories = parseInt(document.getElementById('log-calories').value) || 0;

            if (!label || !amount || parseFloat(amount) <= 0) return;

            // DYNAMIC AUTOMATIC KEYWORD RECOGNITION
            let detectedCategory = "Carb";
            const lowerLabel = label.toLowerCase();
            
            if (lowerLabel.includes('ayam') || lowerLabel.includes('chicken') || lowerLabel.includes('daging') || lowerLabel.includes('beef') || lowerLabel.includes('telur') || lowerLabel.includes('egg') || lowerLabel.includes('fish') || lowerLabel.includes('ikan') || lowerLabel.includes('protein')) {
                detectedCategory = "Protein";
            } else if (lowerLabel.includes('sayur') || lowerLabel.includes('vegetable') || lowerLabel.includes('fruit') || lowerLabel.includes('buah') || lowerLabel.includes('salad') || lowerLabel.includes('broccoli') || lowerLabel.includes('vitamin')) {
                detectedCategory = "Vitamin";
            } else if (lowerLabel.includes('oil') || lowerLabel.includes('butter') || lowerLabel.includes('cheese') || lowerLabel.includes('keju') || lowerLabel.includes('fat')) {
                detectedCategory = "Fat";
            } else if (lowerLabel.includes('teh') || lowerLabel.includes('kopi') || lowerLabel.includes('coffee') || lowerLabel.includes('tea') || lowerLabel.includes('ais') || lowerLabel.includes('juice') || lowerLabel.includes('water') || lowerLabel.includes('air') || lowerLabel.includes('beverage') || lowerLabel.includes('milo')) {
                detectedCategory = "Beverages";
            }

            try {
                await fetch('/api/log_expense', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label, amount: parseFloat(amount), category: detectedCategory, calories })
                });
                document.getElementById('log-label').value    = '';
                document.getElementById('log-amount').value   = '';
                document.getElementById('log-calories').value = '';
                await refreshDashboard();
            } catch (e) {}
        });
    }
    if (document.getElementById('logout-btn')) { document.getElementById('logout-btn').addEventListener('click', () => { window.location.href = '/logout'; }); }
}

function escHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
async function refreshDashboard() { try { await loadDashboard(); await loadMeals(); } catch(e){} }

init();