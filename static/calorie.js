// ── STATE ──
let selectedGender   = 'male';
let selectedActivity = 1.2;
let selectedSpeed    = 250;
let lastResult       = null;   // holds the last calculated result for saving

// ── ON LOAD: restore saved profile if it exists ──
async function loadSavedProfile() {
    try {
        const res = await fetch('/api/calorie_profile');
        if (!res.ok) return;   // 404 = no profile yet, that's fine
        const p = await res.json();
 
        // Restore gender
        selectedGender = p.gender;
        document.querySelectorAll('.gender-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.gender === p.gender);
        });
 
        // Restore fields
        document.getElementById('cal-age').value         = p.age;
        document.getElementById('cal-height').value      = p.height_cm;
        document.getElementById('cal-weight').value      = p.weight_kg;
        document.getElementById('cal-goal-weight').value = p.goal_weight_kg;
 
        // Restore activity
        selectedActivity = p.activity_multiplier;
        document.querySelectorAll('.activity-opt').forEach(o => {
            o.classList.toggle('active', parseFloat(o.dataset.val) === p.activity_multiplier);
        });
 
        // Restore speed
        selectedSpeed = p.speed_kcal;
        document.querySelectorAll('.speed-opt').forEach(o => {
            o.classList.toggle('active', parseInt(o.dataset.kcal) === p.speed_kcal);
        });
 
        // Re-run calculation silently to populate results panel
        calculateFromValues(p.age, p.height_cm, p.weight_kg, p.goal_weight_kg);
 
        showSaveBadge('✅ Profile loaded from last session');
    } catch (e) {
        // Silently ignore — no saved profile is fine
    }
}

// ── GENDER TOGGLE ──
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGender = btn.dataset.gender;
    });
});
 
// ── ACTIVITY SELECTOR ──
document.querySelectorAll('.activity-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.activity-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedActivity = parseFloat(opt.dataset.val);
    });
});
 
// ── SPEED SELECTOR ──
document.querySelectorAll('.speed-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.speed-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedSpeed = parseInt(opt.dataset.kcal);
    });
});
 
// ── CALCULATE BUTTON ──
document.getElementById('cal-btn').addEventListener('click', calculate);
 
function calculate() {
    const age        = parseInt(document.getElementById('cal-age').value);
    const height     = parseFloat(document.getElementById('cal-height').value);
    const weight     = parseFloat(document.getElementById('cal-weight').value);
    const goalWeight = parseFloat(document.getElementById('cal-goal-weight').value);
 
    if (!age || age < 10 || age > 100)
        return showCalMsg('error', 'Please enter a valid age (10–100).');
    if (!height || height < 100 || height > 250)
        return showCalMsg('error', 'Please enter a valid height (100–250 cm).');
    if (!weight || weight < 30 || weight > 300)
        return showCalMsg('error', 'Please enter a valid weight (30–300 kg).');
    if (!goalWeight || goalWeight < 30 || goalWeight > 300)
        return showCalMsg('error', 'Please enter a valid goal weight.');
 
    document.getElementById('cal-msg').className = 'hidden';
    calculateFromValues(age, height, weight, goalWeight);
}
 
function calculateFromValues(age, height, weight, goalWeight) {
    // ── BMR (Mifflin-St Jeor) ──
    let bmr;
    if (selectedGender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }