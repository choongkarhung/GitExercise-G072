import os
import secrets
from flask import Flask, request, jsonify, session, render_template, redirect, url_for, g
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db as _get_db
from datetime import datetime, date
import subprocess

app = Flask(__name__)

# SECURE KEY 
_secret = os.environ.get('SECRET_KEY')
if not _secret:
    if os.environ.get('FLASK_ENV') == 'production':
        raise RuntimeError("SECRET_KEY environment variable must be set in production!")
    _secret = secrets.token_hex(32)
app.secret_key = _secret

def get_db():
    if 'db' not in g:
        g.db = _get_db()
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# ROLE HELPERS

def current_user_role():
    """Return the role of the logged-in user, or None if not logged in."""
    if 'user_id' not in session:
        return None
    db = get_db()
    row = db.execute("SELECT role FROM users WHERE id = ?", (session['user_id'],)).fetchone()
    return row['role'] if row else None

def require_admin():
    """Return a 403 JSON error if the current user is not an admin, else None."""
    role = current_user_role()
    if role != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    return None

# BUDGET HELPER (shared by /api/mealplan and /api/meals) 

def _get_budget_info(user_id, db):
    """
    Returns (session_id, daily_budget, items_list) for the user's active session,
    or (None, None, None) if no session exists.
    items_list is all active food items affordable within daily_budget.
    """
    sess = db.execute("""
        SELECT id, start_balance, days_total, created_at
        FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,)).fetchone()

    if not sess:
        return None, None, None

    session_id    = sess['id']
    start_balance = float(sess['start_balance'])
    days_total    = int(sess['days_total'])

    try:
        session_start = datetime.fromisoformat(sess['created_at']).date()
    except Exception:
        session_start = date.today()

    days_elapsed   = (date.today() - session_start).days
    days_remaining = max(days_total - days_elapsed, 1)

    total_spent_row = db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM expense_logs WHERE session_id = ?
    """, (session_id,)).fetchone()
    total_spent = float(total_spent_row['total'])

    remaining_balance = start_balance - total_spent
    daily_budget      = remaining_balance / days_remaining

    all_items = db.execute("""
        SELECT name, stall, price, category, calories
        FROM food_items
        WHERE is_active = 1 AND price <= ?
        ORDER BY price ASC
    """, (daily_budget,)).fetchall()

    return session_id, round(daily_budget, 2), [dict(i) for i in all_items]

@app.route('/')
def home():
    if 'username' in session and 'user_id' in session:
        db = get_db()
        sess = db.execute("""
            SELECT id FROM survival_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (session['user_id'],)).fetchone()
        if sess:
            return redirect(url_for('dashboard'))
        return redirect(url_for('setup'))
    return render_template('login.html')

@app.route('/setup', methods=['GET'])
def setup():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    force_new = request.args.get('new') == 'true'
    if not force_new:
        db = get_db()
        sess = db.execute("""
            SELECT id FROM survival_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (session['user_id'],)).fetchone()
        if sess:
            return redirect(url_for('dashboard'))
    return render_template('setup.html', username=session.get('username', ''))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('dashboard.html', username=session.get('username', ''))

@app.route('/mealplan')
def mealplan():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('mealplan.html', username=session.get('username', ''))

@app.route('/calorie')
def calorie():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('calorie.html', username=session.get('username', ''))

@app.route('/menu')
def menu():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('menu.html', username=session.get('username', ''))

@app.route('/admin')
def admin():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    # role check added, only admins can view the admin panel
    if current_user_role() != 'admin':
        return redirect(url_for('dashboard'))
    return render_template('admin.html', username=session.get('username', ''))

@app.route('/register', methods=['POST'])
def register():
    data     = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Please provide both username and password'}), 400
    db = get_db()
    if db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone():
        return jsonify({'error': 'Username already exists!'}), 400
    hashed = generate_password_hash(password)
    try:
        db.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed))
        db.commit()
    except Exception:
        return jsonify({'error': 'Database error occurred'}), 500
    return jsonify({'message': 'Registration successful!'}), 201

@app.route('/login', methods=['POST'])
def login():
    data     = request.json
    username = data.get('username')
    password = data.get('password')
    db       = get_db()
    user     = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        session.clear()
        session['username'] = user['username']
        session['user_id']  = user['id']
        session['role']     = user['role']          # cache role in session
        return jsonify({'message': 'Login successful!'}), 200
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/setup', methods=['POST'])
def setup_post():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    data    = request.get_json()
    balance = data.get('balance')
    days    = data.get('days')
    if not balance or float(balance) <= 0:
        return jsonify({'error': 'Invalid balance.'}), 400
    if not days or int(days) <= 0:
        return jsonify({'error': 'Invalid number of days.'}), 400
    db = get_db()
    db.execute("""
        INSERT INTO survival_sessions (user_id, start_balance, days_total, created_at)
        VALUES (?, ?, ?, ?)
    """, (session['user_id'], float(balance), int(days), datetime.now().isoformat()))
    db.commit()
    return jsonify({'message': 'Session created.'}), 200

@app.route('/api/dashboard')
def api_dashboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    user_id = session['user_id']
    db      = get_db()
    sess    = db.execute("""
        SELECT * FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1
    """, (user_id,)).fetchone()
    if not sess:
        return jsonify({'error': 'No session found. Please set up first.'}), 404

    session_id    = sess['id']
    start_balance = float(sess['start_balance'])
    days_total    = int(sess['days_total'])
    try:
        session_start = datetime.fromisoformat(sess['created_at']).date()
    except Exception:
        session_start = date.today()

    days_elapsed   = (date.today() - session_start).days
    days_remaining = max(days_total - days_elapsed, 1)
    session_expired = days_elapsed >= days_total

    total_spent = float(db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM expense_logs WHERE session_id = ?
    """, (session_id,)).fetchone()['total'])

    today_str   = date.today().isoformat()
    spent_today = float(db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expense_logs WHERE session_id = ? AND logged_at LIKE ?
    """, (session_id, today_str + '%')).fetchone()['total'])

    remaining_balance = start_balance - total_spent
    daily_budget      = remaining_balance / days_remaining

    expenses_today = db.execute("""
        SELECT label, amount, logged_at, calories
        FROM expense_logs
        WHERE session_id = ? AND logged_at LIKE ?
        ORDER BY logged_at DESC LIMIT 20
    """, (session_id, today_str + '%')).fetchall()

    return jsonify({
        'session_id':        session_id,
        'start_balance':     start_balance,
        'days_total':        days_total,
        'days_remaining':    days_remaining,
        'days_elapsed':      days_elapsed,
        'session_expired':   session_expired,
        'total_spent':       round(total_spent, 2),
        'spent_today':       round(spent_today, 2),
        'remaining_balance': round(remaining_balance, 2),
        'daily_budget':      round(daily_budget, 2),
        'expenses_today':    [dict(e) for e in expenses_today],
    })

@app.route('/api/log_expense', methods=['POST'])
def api_log_expense():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    data     = request.get_json()
    label    = data.get('label', '').strip()
    amount   = data.get('amount')
    calories = int(data.get('calories', 0))
    if not label:
        return jsonify({'error': 'Description is required.'}), 400
    if not amount or float(amount) <= 0:
        return jsonify({'error': 'Amount must be greater than 0.'}), 400
    db   = get_db()
    sess = db.execute("""
        SELECT id FROM survival_sessions WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1
    """, (session['user_id'],)).fetchone()
    if not sess:
        return jsonify({'error': 'No active session. Please set up first.'}), 404
    try:
        db.execute("""
            INSERT INTO expense_logs (session_id, amount, label, logged_at, calories)
            VALUES (?, ?, ?, ?, ?)
        """, (sess['id'], float(amount), label, datetime.now().isoformat(), calories))
        db.commit()
    except Exception:
        return jsonify({'error': 'Database error.'}), 500
    return jsonify({'message': 'Expense logged!'}), 201

@app.route('/api/expense/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    db = get_db()
    # Verify this expense belongs to the current user's session
    row = db.execute("""
        SELECT e.id FROM expense_logs e
        JOIN survival_sessions s ON e.session_id = s.id
        WHERE e.id = ? AND s.user_id = ?
    """, (expense_id, session['user_id'])).fetchone()
    if not row:
        return jsonify({'error': 'Expense not found or not yours.'}), 404
    db.execute("DELETE FROM expense_logs WHERE id = ?", (expense_id,))
    db.commit()
    return jsonify({'message': 'Expense deleted.'}), 200

@app.route('/api/meals')
def api_meals():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    db = get_db()
    _, daily_budget, items_list = _get_budget_info(session['user_id'], db)
    if items_list is None:
        return jsonify([])
    # Return a varied selection: mix carbs/protein and beverages, up to 15 items
    mains = [i for i in items_list if i['category'] in ('Carbs', 'Protein')]
    bevs  = [i for i in items_list if i['category'] == 'Beverage']
    combined = (mains[:10] + bevs[:5])
    return jsonify(combined)

@app.route('/api/mealplan')
def api_mealplan():
    """
    Returns a 3-meal plan (breakfast, lunch, dinner) for today.

    Algorithm (Phase 2):
    - Budget split: 35% breakfast, 40% lunch, 25% dinner
    - Each meal slot: 1 main (Carbs/Protein) + 1 beverage + optional protein side
    - Stall variety: each meal tries to use a different stall from the previous
    - No item is repeated across meals
    - If a calorie profile exists, calories are distributed ~30/40/30 across meals
      and items closest to the target per-meal calorie range are preferred
    - Stable daily seed: same plan on page refresh; Regenerate button sends
      ?regen=<timestamp> to break the seed
    """
    import random

    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401

    user_id = session['user_id']
    db      = get_db()

    session_id, daily_budget, items_list = _get_budget_info(user_id, db)
    if items_list is None:
        return jsonify({'error': 'No session found.'}), 404

    # Calorie target
    profile = db.execute(
        "SELECT target_calories FROM calorie_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()
    daily_cal_target = profile['target_calories'] if profile else None

    # Per-meal calorie targets (30 / 40 / 30 split)
    cal_targets = None
    if daily_cal_target:
        cal_targets = [
            int(daily_cal_target * 0.30),   # breakfast
            int(daily_cal_target * 0.40),   # lunch
            int(daily_cal_target * 0.30),   # dinner
        ]

    regen_salt = request.args.get('regen', '')          # timestamp from JS on regenerate
    seed_str   = f"{user_id}:{date.today().isoformat()}:{regen_salt}"
    rng        = random.Random(seed_str)

    mains = [i for i in items_list if i['category'] in ('Carbs', 'Protein')]
    bevs  = [i for i in items_list if i['category'] == 'Beverage']

    # Shuffle both pools once so selection order are different every day
    rng.shuffle(mains)
    rng.shuffle(bevs)

    SLICES = [0.35, 0.40, 0.25]
    MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner']

    used_item_names = set()   # prevent item repetition across meals
    used_stalls = []      # track stalls per meal for variety nudge

    meals_out = []

    for meal_idx, (label, pct) in enumerate(zip(MEAL_LABELS, SLICES)):
        budget_slice = daily_budget * pct
        cal_target = cal_targets[meal_idx] if cal_targets else None

        candidate_mains = [
            x for x in mains
            if x['price'] <= budget_slice * 0.80 and x['name'] not in used_item_names
        ]

        if not candidate_mains:
            candidate_mains = [x for x in mains if x['price'] <= budget_slice * 0.80]
        if not candidate_mains:
            candidate_mains = sorted(mains, key=lambda x: x['price'])[:3]

        # Prefer foods from a stall not used in the last meal
        last_stall = used_stalls[-1] if used_stalls else None
        varied = [x for x in candidate_mains if x['stall'] != last_stall]
        pool   = varied if varied else candidate_mains

        if cal_target:
            main_cal_target = int(cal_target * 0.65)
            in_range = [
                x for x in pool
                if abs(x['calories'] - main_cal_target) <= 200 and x['calories'] > 0
            ]
            pool = in_range if in_range else pool

        main = rng.choice(pool)
        used_item_names.add(main['name'])
        used_stalls.append(main['stall'])
        remaining_budget = budget_slice - main['price']

        items_chosen = [main]

        if meal_idx in (0, 1) and remaining_budget >= 1.00:
            protein_sides = [
                x for x in items_list
                if x['category'] == 'Protein'
                and x['price'] <= remaining_budget * 0.55
                and x['name'] not in used_item_names
            ]
            if protein_sides:
                side = rng.choice(protein_sides)
                items_chosen.append(side)
                used_item_names.add(side['name'])
                remaining_budget -= side['price']

        affordable_bevs = [
            x for x in bevs
            if x['price'] <= remaining_budget and x['name'] not in used_item_names
        ]
        if not affordable_bevs:
            affordable_bevs = sorted(bevs, key=lambda x: x['price'])[:3]

        if affordable_bevs:
            bev = rng.choice(affordable_bevs)
            items_chosen.append(bev)
            used_item_names.add(bev['name'])

        total = round(sum(x['price'] for x in items_chosen), 2)
        total_cal = sum(x['calories'] for x in items_chosen)

        meals_out.append({
            'label':      label,
            'items':      items_chosen,
            'total':      total,
            'total_cal':  total_cal,
            'cal_target': cal_target,
        })

    return jsonify({
        'daily_budget':     daily_budget,
        'daily_cal_target': daily_cal_target,
        'meals':            meals_out,
    })

@app.route('/api/calorie_profile', methods=['GET'])
def get_calorie_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    db      = get_db()
    profile = db.execute(
        "SELECT * FROM calorie_profiles WHERE user_id = ?", (session['user_id'],)
    ).fetchone()
    if not profile:
        return jsonify({'error': 'No profile found.'}), 404
    return jsonify(dict(profile))

@app.route('/api/calorie_profile', methods=['POST'])
def save_calorie_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    data     = request.get_json()
    required = [
        'gender', 'age', 'height_cm', 'weight_kg', 'goal_weight_kg',
        'activity_multiplier', 'speed_kcal', 'bmr', 'tdee',
        'target_calories', 'goal_mode',
    ]
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    db = get_db()
    try:
        db.execute("""
            INSERT INTO calorie_profiles
                (user_id, gender, age, height_cm, weight_kg, goal_weight_kg,
                 activity_multiplier, speed_kcal, bmr, tdee,
                 target_calories, goal_mode, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                gender              = excluded.gender,
                age                 = excluded.age,
                height_cm           = excluded.height_cm,
                weight_kg           = excluded.weight_kg,
                goal_weight_kg      = excluded.goal_weight_kg,
                activity_multiplier = excluded.activity_multiplier,
                speed_kcal          = excluded.speed_kcal,
                bmr                 = excluded.bmr,
                tdee                = excluded.tdee,
                target_calories     = excluded.target_calories,
                goal_mode           = excluded.goal_mode,
                updated_at          = excluded.updated_at
        """, (
            session['user_id'], data['gender'], int(data['age']),
            float(data['height_cm']), float(data['weight_kg']),
            float(data['goal_weight_kg']), float(data['activity_multiplier']),
            int(data['speed_kcal']), int(data['bmr']), int(data['tdee']),
            int(data['target_calories']), data['goal_mode'],
            datetime.now().isoformat(),
        ))
        db.commit()
    except Exception:
        return jsonify({'error': 'Database error.'}), 500
    return jsonify({'message': 'Profile saved!'}), 200

@app.route('/api/calorie_today')
def api_calorie_today():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    user_id = session['user_id']
    db      = get_db()
    profile = db.execute(
        "SELECT target_calories, goal_mode, weight_kg, goal_weight_kg FROM calorie_profiles WHERE user_id = ?",
        (user_id,)
    ).fetchone()
    if not profile:
        return jsonify({'has_profile': False}), 200
    sess = db.execute("""
        SELECT id FROM survival_sessions WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1
    """, (user_id,)).fetchone()
    calories_today = 0
    if sess:
        today_str = date.today().isoformat()
        row = db.execute("""
            SELECT COALESCE(SUM(calories), 0) AS total
            FROM expense_logs WHERE session_id = ? AND logged_at LIKE ?
        """, (sess['id'], today_str + '%')).fetchone()
        calories_today = int(row['total'])
    return jsonify({
        'has_profile':     True,
        'target_calories': profile['target_calories'],
        'goal_mode':       profile['goal_mode'],
        'calories_today':  calories_today,
        'weight_kg':       profile['weight_kg'],
        'goal_weight_kg':  profile['goal_weight_kg'],
    })

# FOOD ITEMS 

@app.route('/api/food_items', methods=['GET'])
def get_food_items():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
    db    = get_db()
    items = db.execute("""
        SELECT id, name, stall, price, category, calories
        FROM food_items WHERE is_active = 1
        ORDER BY stall ASC, name ASC
    """).fetchall()
    return jsonify([dict(item) for item in items])

@app.route('/api/food_items', methods=['POST'])
def create_food_item():
    err = require_admin()
    if err:
        return err
    data     = request.get_json()
    name     = data.get('name', '').strip()
    stall    = data.get('stall', '').strip()
    price    = data.get('price')
    category = data.get('category', '').strip()
    calories = data.get('calories', 0)

    VALID_CATEGORIES = {'Carbs', 'Protein', 'Beverage', 'Juice', 'Snack'}
    if not name or not stall or price is None:
        return jsonify({'error': 'Missing required fields (Name, Stall, Price).'}), 400
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category. Must be one of: {", ".join(sorted(VALID_CATEGORIES))}'}), 400

    db = get_db()
    try:
        db.execute("""
            INSERT INTO food_items (name, stall, price, category, calories, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (name, stall, float(price), category, int(calories)))
        db.commit()
    except Exception:
        return jsonify({'error': 'Item already exists or database constraint failed.'}), 400
    return jsonify({'message': 'Menu item added successfully!'}), 201

@app.route('/api/food_items/<int:item_id>', methods=['PUT'])
def update_food_item(item_id):
    err = require_admin()
    if err:
        return err
    data     = request.get_json()
    category = data.get('category', '').strip()
    VALID_CATEGORIES = {'Carbs', 'Protein', 'Beverage', 'Juice', 'Snack'}
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category.'}), 400
    db = get_db()
    try:
        db.execute("""
            UPDATE food_items
            SET name = ?, stall = ?, price = ?, category = ?, calories = ?
            WHERE id = ? AND is_active = 1
        """, (data['name'], data['stall'], float(data['price']), category, int(data['calories']), item_id))
        db.commit()
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 400
    return jsonify({'message': 'Menu item updated successfully!'}), 200

@app.route('/api/food_items/<int:item_id>', methods=['DELETE'])
def delete_food_item(item_id):
    err = require_admin()
    if err:
        return err
    db = get_db()
    try:
        db.execute("UPDATE food_items SET is_active = 0 WHERE id = ?", (item_id,))
        db.commit()
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 400
    return jsonify({'message': 'Menu item removed successfully!'}), 200

# USER MANAGEMENT (admin only)

@app.route('/api/users', methods=['GET'])
def get_users():
    err = require_admin()
    if err:
        return err
    db    = get_db()
    users = db.execute("SELECT id, username, role FROM users ORDER BY id ASC").fetchall()
    return jsonify([dict(u) for u in users])

@app.route('/api/users/<int:uid>/role', methods=['PUT'])
def update_user_role(uid):
    err = require_admin()
    if err:
        return err
    data = request.get_json()
    new_role = data.get('role', '').strip()
    if new_role not in ('student', 'admin'):
        return jsonify({'error': 'Role must be "student" or "admin".'}), 400
    # Prevent self-demotion
    if uid == session['user_id'] and new_role != 'admin':
        return jsonify({'error': 'You cannot remove your own admin role.'}), 400
    db = get_db()
    db.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, uid))
    db.commit()
    return jsonify({'message': f'Role updated to {new_role}.'}), 200

if __name__ == "__main__":
    app.run(debug=True)