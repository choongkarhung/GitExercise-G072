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