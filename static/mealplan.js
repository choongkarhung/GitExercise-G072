let planData    = null;
let loggedMeals = new Set();

const CAT_ICONS = {
    'Carbs':    '🍚',
    'Protein':  '🍗',
    'Beverage': '🥤',
    'Juice':    '🧃',
    'Snack':    '🍪',
};

const MEAL_META = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅', sub: 'Start the day right' },
    { key: 'lunch',     label: 'Lunch',     icon: '☀️',  sub: 'Midday fuel'         },
    { key: 'dinner',    label: 'Dinner',    icon: '🌙', sub: 'End the day well'    },
];

async function init() {
    await generatePlan();
}

// GENERATE PLAN
// Pass ?regen=<timestamp> to break the daily seed and get a fresh plan.
async function generatePlan(isRegen = false) {
    loggedMeals = new Set();
    showLoading();
    document.getElementById('log-all-section').style.display = 'none';

    const url = isRegen
        ? `/api/mealplan?regen=${Date.now()}` // timestamp breaks stable seed
        : '/api/mealplan';                    // same seed = same plan today

    try {
        const res = await fetch(url);
        if (!res.ok) {
            if (res.status === 401) { window.location.href = '/'; return; }
            throw new Error('Failed to load meal plan');
        }
        planData = await res.json();
        renderRibbon(planData);
        renderMeals(planData.meals, planData.daily_cal_target);
        document.getElementById('log-all-section').style.display = 'block';
        document.getElementById('log-all-btn').disabled = false;
        document.getElementById('log-all-msg').className = 'hidden';
    } catch (e) {
        console.error(e);
        document.getElementById('meals-row').innerHTML =
            `<div class="mp-loading"><p>Couldn't load meal plan. Please try again.</p></div>`;
    }
}

function showLoading() {
    document.getElementById('meals-row').innerHTML = `
        <div class="mp-loading" id="mp-loading">
            <div class="loading-spinner"></div>
            <p>Calculating your meals...</p>
        </div>`;
}

// BUDGET RIBBON
function renderRibbon(data) {
    const budget   = data.daily_budget;
    const planCost = data.meals.reduce((s, m) => s + m.total, 0);
    const save     = budget - planCost;

    document.getElementById('rb-budget').textContent = `RM ${budget.toFixed(2)}`;
    document.getElementById('rb-cost').textContent   = `RM ${planCost.toFixed(2)}`;
    document.getElementById('rb-save').textContent   = `RM ${Math.max(save, 0).toFixed(2)}`;

    // Calorie ribbon item
    const totalCal  = data.meals.reduce((s, m) => s + (m.total_cal || 0), 0);
    const calTarget = data.daily_cal_target;
    const calRibbon = document.getElementById('rb-cal-wrap');

    if (calTarget && calRibbon) {
        calRibbon.style.display = '';
        document.getElementById('rb-cal').textContent =
            `${totalCal.toLocaleString()} / ${calTarget.toLocaleString()} kcal`;
    } else if (calRibbon) {
        calRibbon.style.display = 'none';
    }

    const badge = document.getElementById('rb-status');
    const pct   = budget > 0 ? (planCost / budget) * 100 : 0;
    badge.className = 'ribbon-badge';
    if (pct <= 80) {
        badge.classList.add('ok');
        badge.textContent = 'Within Budget';
    } else if (pct <= 100) {
        badge.classList.add('warn');
        badge.textContent = 'Nearly Full';
    } else {
        badge.classList.add('danger');
        badge.textContent = 'Over Budget';
    }
}

// MEAL CARDS
function renderMeals(meals, dailyCalTarget) {
    const row = document.getElementById('meals-row');
    row.innerHTML = '';

    meals.forEach((meal, idx) => {
        const meta      = MEAL_META[idx] || MEAL_META[0];
        const total     = meal.items.reduce((s, i) => s + i.price, 0);
        const totalCal  = meal.total_cal || meal.items.reduce((s, i) => s + (i.calories || 0), 0);
        const calTarget = meal.cal_target;

        let calBadgeHtml = '';
        if (totalCal > 0) {
            let calClass = 'meal-cal-ok';
            if (calTarget) {
                const diff = totalCal - calTarget;
                if (diff > 150)       calClass = 'meal-cal-over';
                else if (diff < -150) calClass = 'meal-cal-under';
            }
            calBadgeHtml = `<span class="meal-cal-badge ${calClass}">${totalCal.toLocaleString()} kcal</span>`;
        }

        const card = document.createElement('div');
        card.className   = `meal-card ${meta.key}`;
        card.dataset.idx = idx;

        card.innerHTML = `
            <div class="meal-card-header">
                <div class="meal-time-badge">${meta.icon} ${meta.label}</div>
                <p class="meal-card-title">${meta.label} Plan</p>
                <p class="meal-card-sub">${meta.sub} · ${meal.items.length} item${meal.items.length !== 1 ? 's' : ''}</p>
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
                        <div class="meal-food-right">
                            ${item.calories > 0 ? `<span class="meal-item-kcal">${item.calories} kcal</span>` : ''}
                            <span class="meal-food-cat cat-${item.category.toLowerCase()}">${item.category}</span>
                            <span class="meal-food-price">RM ${item.price.toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="meal-card-footer">
                <div class="meal-footer-left">
                    <div class="meal-total-label">Meal Total</div>
                    <div class="meal-total-val">RM ${total.toFixed(2)}</div>
                    ${calBadgeHtml}
                </div>
                <button class="btn-log-meal" id="log-meal-${idx}" data-idx="${idx}">
                    Log ${meta.label}
                </button>
            </div>
        `;

        row.appendChild(card);
        card.querySelector(`#log-meal-${idx}`).addEventListener('click', () => logMeal(idx));
    });
}

// HELPERS
function mealSummary(idx) {
    const meal  = planData.meals[idx];
    const meta  = MEAL_META[idx];
    return {
        label:    `[${meta.label}] ${meal.items.map(i => i.name).join(' + ')}`,
        amount:   parseFloat(meal.items.reduce((s, i) => s + i.price, 0).toFixed(2)),
        calories: meal.items.reduce((s, i) => s + (i.calories || 0), 0),
    };
}

// LOG A SINGLE MEAL
async function logMeal(idx) {
    if (loggedMeals.has(idx)) return;
    const { label, amount, calories } = mealSummary(idx);

    try {
        const res = await fetch('/api/log_expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, amount, calories })
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
    btn.disabled    = true;
    btn.textContent = 'Logging...';

    try {
        let successCount = 0;
        for (let idx = 0; idx < planData.meals.length; idx++) {
            if (loggedMeals.has(idx)) { successCount++; continue; }
            const { label, amount, calories } = mealSummary(idx);

            const res = await fetch('/api/log_expense', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label, amount, calories })
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
        const grandCal = planData.meals.reduce((s, m) =>
            s + m.items.reduce((ms, i) => ms + (i.calories || 0), 0), 0);

        msgBox.className = 'success';
        const calNote = grandCal > 0 ? ` · ${grandCal.toLocaleString()} kcal total` : '';
        msgBox.textContent =
            `✅ ${successCount} meals logged! RM ${grandTotal.toFixed(2)} added to your dashboard${calNote}.`;
        btn.textContent = '✅ All Logged!';
    } catch (e) {
        msgBox.className   = 'error';
        msgBox.textContent = 'Something went wrong. Please try again.';
        btn.disabled       = false;
        btn.textContent    = '✅ Log All Meals to Dashboard';
    }
});

// Regenerate triggers a fresh seed
document.getElementById('regen-btn').addEventListener('click', () => generatePlan(true));

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

init();