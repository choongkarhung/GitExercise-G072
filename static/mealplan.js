let planData = null;  // { daily_budget, meals: [{time, items, total}] }
let loggedMeals = new Set(); // track which meal lists have been logged

const CAT_ICONS = {
    'Carbs':    '🍚',
    'Protein':  '🍗',
    'Beverage': '🥤',
};

async function init() {
    await generatePlan();
}

// GENERATE PLAN 
async function generatePlan() {
    loggedMeals = new Set();
    showLoading(true);
    document.getElementById('log-all-section').style.display = 'none';

    try {
        const res = await fetch('/api/mealplan');
        if (!res.ok) {
            if (res.status === 401) { window.location.href = '/'; return; }
            throw new Error('Failed to load meal plan');
        }
        planData = await res.json();
        renderRibbon(planData);
        renderMeals(planData.meals);
        document.getElementById('log-all-section').style.display = 'block';
        document.getElementById('log-all-btn').disabled = false;
        document.getElementById('log-all-msg').className = 'hidden';
    } catch (e) {
        console.error(e);
        document.getElementById('meals-row').innerHTML =
            `<div class="mp-loading"><p>Couldn't load meal plan. Please try again.</p></div>`;
    }
}

function showLoading(on) {
    const row = document.getElementById('meals-row');
    if (on) {
        row.innerHTML = `
            <div class="mp-loading" id="mp-loading">
                <div class="loading-spinner"></div>
                <p>Calculating your meals...</p>
            </div>`;
    }
}

// RIBBON 
function renderRibbon(data) {
    const budget   = data.daily_budget;
    const planCost = data.meals.reduce((s, m) => s + m.total, 0);
    const save     = budget - planCost;

    document.getElementById('rb-budget').textContent = `RM ${budget.toFixed(2)}`;
    document.getElementById('rb-cost').textContent   = `RM ${planCost.toFixed(2)}`;
    document.getElementById('rb-save').textContent   = `RM ${Math.max(save, 0).toFixed(2)}`;

    const badge = document.getElementById('rb-status');
    const pct   = budget > 0 ? (planCost / budget) * 100 : 0;

    badge.className = 'ribbon-badge';
    if (pct <= 80) {
        badge.classList.add('ok');
        badge.textContent = '✅ Within Budget';
    } else if (pct <= 100) {
        badge.classList.add('warn');
        badge.textContent = '⚠️ Nearly Full';
    } else {
        badge.classList.add('danger');
        badge.textContent = '🔴 Over Budget';
    }
}

// MEAL CARDS 
const MEAL_META = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅', sub: 'Start the day right' },
    { key: 'lunch',     label: 'Lunch',     icon: '☀️',  sub: 'Midday fuel' },
    { key: 'dinner',    label: 'Dinner',    icon: '🌙',  sub: 'End the day well' },
];

function renderMeals(meals) {
    const row = document.getElementById('meals-row');
    row.innerHTML = '';

    meals.forEach((meal, idx) => {
        const meta  = MEAL_META[idx] || MEAL_META[0];
        const total = meal.items.reduce((s, i) => s + i.price, 0);

        const card = document.createElement('div');
        card.className = `meal-card ${meta.key}`;
        card.dataset.idx = idx;

        card.innerHTML = `
            <div class="meal-card-header">
                <div class="meal-time-badge">${meta.icon} ${meta.label}</div>
                <p class="meal-card-title">${meta.label} Plan</p>
                <p class="meal-card-sub">${meta.sub} · ${meal.items.length} items</p>
            </div>
            <div class="meal-items">
                ${meal.items.map(item => `
                    <div class="meal-food-item">
                        <div class="meal-food-left">
                            <span class="meal-food-cat-icon">${CAT_ICONS[item.category] || '🍴'}</span>
                            <div class="meal-food-info">
                                <div class="meal-food-name">${escHtml(item.name)}</div>
                                <div class="meal-food-stall">${escHtml(item.stall)}</div>
                            </div>
                        </div>
                        <span class="meal-food-cat cat-${item.category.toLowerCase()}">${item.category}</span>
                        <span class="meal-food-price">RM ${item.price.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="meal-card-footer">
                <div>
                    <div class="meal-total-label">Meal Total</div>
                    <div class="meal-total-val">RM ${total.toFixed(2)}</div>
                </div>
                <button class="btn-log-meal" id="log-meal-${idx}" data-idx="${idx}">
                    Log ${meta.label}
                </button>
            </div>
        `;

        row.appendChild(card);

        // Individual log button
        card.querySelector(`#log-meal-${idx}`).addEventListener('click', () => logMeal(idx));
    });
}

// LOG A SINGLE MEAL 
async function logMeal(idx) {
    if (loggedMeals.has(idx)) return;

    const meal  = planData.meals[idx];
    const meta  = MEAL_META[idx];
    const items = meal.items;
    const total = items.reduce((s, i) => s + i.price, 0);
    const totalCalories = items.reduce((s, i) => s + (i.calories || 0), 0);

    // Build a combined label
    const label = `[${meta.label}] ${items.map(i => i.name).join(' + ')}`;

    try {
        const res = await fetch('/api/log_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, amount: parseFloat(total.toFixed(2)), calories: totalCalories })
        });

        if (res.ok) {
            loggedMeals.add(idx);
            const btn = document.getElementById(`log-meal-${idx}`);
            btn.textContent = '✅ Logged!';
            btn.classList.add('logged');
            btn.disabled = true;
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to log meal.');
        }
    } catch (e) {
        alert('Network error. Please try again.');
    }
}

// LOG ALL MEALS 
document.getElementById('log-all-btn').addEventListener('click', async () => {
    const msgBox = document.getElementById('log-all-msg');
    const btn    = document.getElementById('log-all-btn');
    btn.disabled = true;
    btn.textContent = 'Logging...';

    try {
        let successCount = 0;
        for (let idx = 0; idx < planData.meals.length; idx++) {
            if (loggedMeals.has(idx)) { successCount++; continue; }

            const meal  = planData.meals[idx];
            const meta  = MEAL_META[idx];
            const total = meal.items.reduce((s, i) => s + i.price, 0);
            const totalCalories = meal.items.reduce((s, i) => s + (i.calories || 0), 0);
            const label = `[${meta.label}] ${meal.items.map(i => i.name).join(' + ')}`;

            const res = await fetch('/api/log_expense', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label, amount: parseFloat(total.toFixed(2)), calories: totalCalories })
            });

            if (res.ok) {
                loggedMeals.add(idx);
                const logBtn = document.getElementById(`log-meal-${idx}`);
                if (logBtn) {
                    logBtn.textContent = '✅ Logged!';
                    logBtn.classList.add('logged');
                    logBtn.disabled = true;
                }
                successCount++;
            }
        }

        const grandTotal = planData.meals.reduce((s, m) =>
            s + m.items.reduce((ms, i) => ms + i.price, 0), 0);

        msgBox.className = 'success';
        msgBox.textContent =
            `✅ ${successCount} meals logged! RM ${grandTotal.toFixed(2)} added to your dashboard.`;
        btn.textContent = '✅ All Logged!';

    } catch (e) {
        msgBox.className = 'error';
        msgBox.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false;
        btn.textContent = '✅ Log All Meals to Dashboard';
    }
});

// REGENERATE 
document.getElementById('regen-btn').addEventListener('click', generatePlan);

// HELPERS 
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

init();