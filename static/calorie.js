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