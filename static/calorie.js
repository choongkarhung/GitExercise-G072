let selectedGender   = 'male';
let selectedActivity = 1.2;
let selectedSpeed    = 250;
let lastResult       = null;   // holds the last calculated result for saving

// restore saved profile if it exists 
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
        document.getElementById('cal-age').value = p.age;
        document.getElementById('cal-height').value = p.height_cm;
        document.getElementById('cal-weight').value = p.weight_kg;
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
        // no saved profile is fine
    }
}

// GENDER TOGGLE 
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGender = btn.dataset.gender;
    });
});
 
// ACTIVITY SELECTOR 
document.querySelectorAll('.activity-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.activity-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedActivity = parseFloat(opt.dataset.val);
    });
});
 
//  SPEED SELECTOR 
document.querySelectorAll('.speed-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.speed-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedSpeed = parseInt(opt.dataset.kcal);
    });
});
 
// CALCULATE BUTTON 
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
    // BMR (Mifflin-St Jeor) 
    let bmr;
    if (selectedGender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

       // TDEE 
    const tdee = bmr * selectedActivity;
 
    // Goal direction
    const weightDiff = goalWeight - weight;
    let adjustment   = 0;
    let goalMode     = 'maintain';
 
    if (Math.abs(weightDiff) < 0.5) {
        goalMode   = 'maintain';
        adjustment = 0;
    } else if (weightDiff < 0) {
        goalMode   = 'deficit';
        adjustment = -selectedSpeed;
    } else {
        goalMode   = 'surplus';
        adjustment = +selectedSpeed;
    }
 
    const targetCalories = Math.round(tdee + adjustment);
 
    // BMI 
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
 
    //  Macros (30/40/30) 
    const proteinG = Math.round((targetCalories * 0.30) / 4);
    const carbsG = Math.round((targetCalories * 0.40) / 4);
    const fatG = Math.round((targetCalories * 0.30) / 9);
 
    //  Timeline 
    let timelineStr = 'Already at your goal! 🎉';
    if (Math.abs(weightDiff) >= 0.5 && selectedSpeed > 0) {
        const kgPerWeek = selectedSpeed / 7700 * 7;
        const weeksNeeded = Math.abs(weightDiff) / kgPerWeek;
        const months = Math.floor(weeksNeeded / 4.33);
        const weeks = Math.round(weeksNeeded % 4.33);
        if (months === 0) {
            timelineStr = `About ${Math.round(weeksNeeded)} week${Math.round(weeksNeeded) !== 1 ? 's' : ''}`;
        } else if (weeks === 0) {
            timelineStr = `About ${months} month${months !== 1 ? 's' : ''}`;
        } else {
            timelineStr = `About ${months} month${months !== 1 ? 's' : ''} and ${weeks} week${weeks !== 1 ? 's' : ''}`;
        }
    }

        // Store for saving
    lastResult = {
        gender:               selectedGender,
        age:                  age,
        height_cm:            height,
        weight_kg:            weight,
        goal_weight_kg:       goalWeight,
        activity_multiplier:  selectedActivity,
        speed_kcal:           selectedSpeed,
        bmr:                  Math.round(bmr),
        tdee:                 Math.round(tdee),
        target_calories:      targetCalories,
        goal_mode:            goalMode,
    };
 
    renderResults({
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        adjustment,
        targetCalories,
        goalMode,
        goalWeight,
        weightDiff,
        bmi,
        proteinG,
        carbsG,
        fatG,
        timelineStr,
    });
}
 
function renderResults(d) {
    document.getElementById('results-placeholder').classList.add('hidden');
    const content = document.getElementById('results-content');
    content.classList.remove('hidden');
    content.classList.add('visible');
 
    // Goal banner
    const banner = document.getElementById('goal-banner');
    banner.className = 'goal-banner';
    if (d.goalMode === 'deficit') {
        banner.classList.add('deficit');
        document.getElementById('goal-label').textContent = 'Weight Loss Mode';
        document.getElementById('goal-sub').textContent =
            `Eating ${Math.abs(d.adjustment)} kcal below TDEE daily to lose weight`;
    } else if (d.goalMode === 'surplus') {
        banner.classList.add('surplus');
        document.getElementById('goal-label').textContent = 'Weight Gain Mode';
        document.getElementById('goal-sub').textContent =
            `Eating ${d.adjustment} kcal above TDEE daily to gain weight`;
    } else {
        document.getElementById('goal-label').textContent = 'Maintaining Weight';
        document.getElementById('goal-sub').textContent = 'Your goal weight matches your current weight!';
    }
 
    document.getElementById('target-value').textContent = d.targetCalories.toLocaleString();
    document.getElementById('res-bmr').textContent = d.bmr.toLocaleString();
    document.getElementById('res-tdee').textContent = d.tdee.toLocaleString();
    const adjustStr = d.adjustment === 0 ? '±0'
        : d.adjustment > 0 ? `+${d.adjustment}` : `${d.adjustment}`;
    document.getElementById('res-adjust').textContent = adjustStr;
    document.getElementById('res-goalwt').textContent = `${d.goalWeight} kg`;
 
    // BMI
    const bmiVal = d.bmi.toFixed(1);
    document.getElementById('bmi-value').textContent = bmiVal;
    let bmiCat, bmiClass;
    if (d.bmi < 18.5) { bmiCat = 'Underweight'; bmiClass = 'bmi-under'; }
    else if (d.bmi < 25) { bmiCat = 'Normal'; bmiClass = 'bmi-normal'; }
    else if (d.bmi < 30) { bmiCat = 'Overweight'; bmiClass = 'bmi-over'; }
    else { bmiCat = 'Obese'; bmiClass = 'bmi-obese'; }
    const bmiCatEl = document.getElementById('bmi-category');
    bmiCatEl.textContent = bmiCat;
    bmiCatEl.className   = `bmi-category ${bmiClass}`;
 
    const bmiPct = Math.min(Math.max((d.bmi - 10) / (40 - 10) * 100, 2), 98);
    document.getElementById('bmi-marker').style.left = `${bmiPct}%`;
 
    document.getElementById('timeline-val').textContent = d.timelineStr;
    document.getElementById('macro-protein').textContent = `${d.proteinG}g`;
    document.getElementById('macro-carbs').textContent = `${d.carbsG}g`;
    document.getElementById('macro-fat').textContent = `${d.fatG}g`;
 
    // Show save button once we have results
    document.getElementById('save-profile-btn').style.display = 'flex';
}
 
// SAVE PROFILE 
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    if (!lastResult) return;
 
    const btn = document.getElementById('save-profile-btn');
    btn.disabled  = true;
    btn.textContent = 'Saving...';
 
    try {
        const res = await fetch('/api/calorie_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lastResult),
        });
 
        if (res.ok) {
            showSaveBadge('✅ Profile saved! Dashboard will now show your calorie target.');
            btn.textContent = '✅ Saved!';
            setTimeout(() => {
                btn.textContent = '💾 Save Profile';
                btn.disabled = false;
            }, 3000);
        } else {
            const data = await res.json();
            showCalMsg('error', data.error || 'Failed to save profile.');
            btn.textContent = 'Save Profile';
            btn.disabled = false;
        }
    } catch (e) {
        showCalMsg('error', 'Network error. Please try again.');
        btn.textContent = 'Save Profile';
        btn.disabled    = false;
    }
});
 
// HELPERS
function showCalMsg(type, text) {
    const el = document.getElementById('cal-msg');
    el.className   = type;
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'hidden'; }, 5000);
}
 
function showSaveBadge(text) {
    const badge = document.getElementById('save-badge');
    badge.textContent   = text;
    badge.style.display = 'block';
    clearTimeout(badge._timer);
    badge._timer = setTimeout(() => { badge.style.display = 'none'; }, 5000);
}
 
// ── INIT ──
loadSavedProfile();