import os
from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
from datetime import datetime, date
import subprocess

app = Flask(__name__)

# SECURE KEY
app.secret_key = os.environ.get('SECRET_KEY', 'mmu_broke_student_secret_2024')

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
        db.close()

        if sess:
            return redirect(url_for('dashboard'))  # Send straight to dashboard if saved
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
        db.close()

        if sess:
            return redirect(url_for('dashboard'))
        
    return render_template('setup.html', username=session.get('username', ''))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('dashboard.html', username=session.get('username', ''))

# AUTHENTICATION 

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Please provide both username and password'}), 400

    db = get_db()
    user_check = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()

    if user_check:
        db.close()
        return jsonify({'error': 'Username already exists!'}), 400

    hashed_password = generate_password_hash(password)

    try:
        db.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                   (username, hashed_password))
        db.commit()
    except Exception as e:
        return jsonify({'error': 'Database error occurred'}), 500
    finally:
        db.close()

    return jsonify({'message': 'Registration successful!'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    db.close()

    if user and check_password_hash(user['password_hash'], password):
        session.clear()
        session['username'] = user['username']
        session['user_id'] = user['id']
        return jsonify({'message': 'Login successful!'}), 200

    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    return redirect(url_for('home'))

# SETUP 

@app.route('/setup', methods=['POST'])
def setup_post():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401

    data = request.get_json()
    balance = data.get('balance')
    days = data.get('days')

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

    session['balance'] = float(balance)
    session['days'] = int(days)

    db.close()
    return jsonify({'message': 'Session created.'}), 200

# DASHBOARD DATA 

@app.route('/api/dashboard')
def api_dashboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401

    user_id = session['user_id']
    db = get_db()

    # Get the most recent session 
    sess = db.execute("""
        SELECT * FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,)).fetchone()

    if not sess:
        db.close()
        return jsonify({'error': 'No session found. Please set up first.'}), 404

    session_id   = sess['id']
    start_balance = float(sess['start_balance'])
    days_total   = int(sess['days_total'])
    created_at   = sess['created_at']  # ISO string

    # Parse session start date
    try:
        session_start = datetime.fromisoformat(created_at).date()
    except Exception:
        session_start = date.today()

    # Days elapsed since session start
    days_elapsed = (date.today() - session_start).days
    days_remaining = max(days_total - days_elapsed, 0)

    # Total spent across the whole session
    total_spent_row = db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expense_logs
        WHERE session_id = ?
    """, (session_id,)).fetchone()
    total_spent = float(total_spent_row['total'])

    # Spent today only
    today_str = date.today().isoformat()  # "YYYY-MM-DD"
    spent_today_row = db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expense_logs
        WHERE session_id = ?
        AND logged_at LIKE ?
    """, (session_id, today_str + '%')).fetchone()
    spent_today = float(spent_today_row['total'])

    remaining_balance = start_balance - total_spent

    # Daily budget = remaining balance / remaining days (fallback to 1 day)
    daily_budget = remaining_balance / max(days_remaining, 1)

    # Today's expenses (last 20, most recent first)
    expenses_today = db.execute("""
        SELECT label, amount, logged_at
        FROM expense_logs
        WHERE session_id = ?
        AND logged_at LIKE ?
        ORDER BY logged_at DESC
        LIMIT 20
    """, (session_id, today_str + '%')).fetchall()

    db.close()

    return jsonify({
        'session_id':        session_id,
        'start_balance':     start_balance,
        'days_total':        days_total,
        'days_remaining':    days_remaining,
        'days_elapsed':      days_elapsed,
        'total_spent':       round(total_spent, 2),
        'spent_today':       round(spent_today, 2),
        'remaining_balance': round(remaining_balance, 2),
        'daily_budget':      round(daily_budget, 2),
        'expenses_today':    [dict(e) for e in expenses_today],
    })

# LOG EXPENSE 

@app.route('/api/log_expense', methods=['POST'])
def api_log_expense():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
 
    data     = request.get_json()
    label    = data.get('label', '').strip()
    amount   = data.get('amount')
    calories = int(data.get('calories', 0))   # ← NEW: default 0 for manual entries
 
    if not label:
        return jsonify({'error': 'Description is required.'}), 400
    if not amount or float(amount) <= 0:
        return jsonify({'error': 'Amount must be greater than 0.'}), 400
 
    db = get_db()
 
    sess = db.execute("""
        SELECT id FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (session['user_id'],)).fetchone()
 
    if not sess:
        db.close()
        return jsonify({'error': 'No active session. Please set up first.'}), 404
 
    try:
        db.execute("""
            INSERT INTO expense_logs (session_id, amount, label, logged_at, calories)
            VALUES (?, ?, ?, ?, ?)
        """, (sess['id'], float(amount), label, datetime.now().isoformat(), calories))
        db.commit()
    except Exception as e:
        db.close()
        return jsonify({'error': 'Database error.'}), 500
 
    db.close()
    return jsonify({'message': 'Expense logged!'}), 201

# MEAL SUGGESTIONS

@app.route('/api/meals')
def api_meals():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401

    user_id = session['user_id']
    db = get_db()

    # Get remaining balance and days to compute daily budget
    sess = db.execute("""
        SELECT id, start_balance, days_total, created_at FROM survival_sessions
        WHERE user_id = ?
                      
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,)).fetchone()

    if not sess:
        db.close()
        return jsonify([])

    session_id    = sess['id']
    start_balance = float(sess['start_balance'])
    days_total    = int(sess['days_total'])

    try:
        session_start = datetime.fromisoformat(sess['created_at']).date()
    except Exception:
        session_start = date.today()

    days_elapsed   = (date.today() - session_start).days
    days_remaining = max(days_total - days_elapsed, 0)

    total_spent_row = db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM expense_logs WHERE session_id = ?
    """, (session_id,)).fetchone()
    total_spent = float(total_spent_row['total'])

    remaining_balance = start_balance - total_spent
    daily_budget      = remaining_balance / max(days_remaining, 1)

    # Recommend meals that fits the daily budget
    # Prioritise cheap and varied categories
    meals = db.execute("""
        SELECT name, stall, price, category, calories
        FROM food_items
        WHERE is_active = 1 AND price <= ?
        ORDER BY price ASC
        LIMIT 15
    """, (daily_budget,)).fetchall()

    db.close()
    return jsonify([dict(m) for m in meals])

def setup_database():
    subprocess.run(["python", "init_db.py"])
    print("Database synced automatically!")

# Run the setup before the first request or at startup
with app.app_context():
    setup_database()

@app.route('/mealplan')
def mealplan():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('mealplan.html', username=session.get('username', ''))
 
 
@app.route('/api/mealplan')
def api_mealplan():
    """
    Returns a 3-meal plan (breakfast, lunch, dinner) for today.
    Each meal contains at least one Carbs/Protein item + one Beverage.
    Items are picked randomly from those fitting the per-meal budget slice.
    The plan is seeded by today's date + user_id so it stays stable
    within the same day but changes daily & on regenerate (uses a random salt).
    """
    import random
 
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
 
    user_id = session['user_id']
    db = get_db()
 
    # Get the active session
    sess = db.execute("""
        SELECT id, start_balance, days_total, created_at
        FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,)).fetchone()
 
    if not sess:
        db.close()
        return jsonify({'error': 'No session found.'}), 404
 
    session_id    = sess['id']
    start_balance = float(sess['start_balance'])
    days_total    = int(sess['days_total'])
 
    try:
        session_start = datetime.fromisoformat(sess['created_at']).date()
    except Exception:
        session_start = date.today()
 
    days_elapsed   = (date.today() - session_start).days
    days_remaining = max(days_total - days_elapsed, 0)
 
    total_spent_row = db.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM expense_logs WHERE session_id = ?
    """, (session_id,)).fetchone()
    total_spent = float(total_spent_row['total'])
 
    remaining_balance = start_balance - total_spent
    daily_budget      = remaining_balance / max(days_remaining, 1)
 
    # Fetch all affordable active food items
    all_items = db.execute("""
        SELECT name, stall, price, category, calories
        FROM food_items
        WHERE is_active = 1 AND price <= ?
        ORDER BY price ASC
    """, (daily_budget,)).fetchall()
    db.close()
 
    items_list = [dict(i) for i in all_items]
 
    # Separate by category
    carbs_protein = [i for i in items_list if i['category'] in ('Carbs', 'Protein')]
    beverages     = [i for i in items_list if i['category'] == 'Beverage']
 
    # Budget slices (40% breakfast, 35% lunch, 25% dinner)
    slices = [0.33, 0.34, 0.33]
 
    meal_labels = ['Breakfast', 'Lunch', 'Dinner']
    meals_out   = []
 
    rng = random.Random()  # fresh random each call = regenerate works
 
    for i, (label, pct) in enumerate(zip(meal_labels, slices)):
        budget_slice = daily_budget * pct
 
        # Pick affordable carbs/protein
        affordable_cp  = [x for x in carbs_protein if x['price'] <= budget_slice * 0.80]
        affordable_bev = [x for x in beverages     if x['price'] <= budget_slice * 0.40]
 
        if not affordable_cp:
            affordable_cp = sorted(carbs_protein, key=lambda x: x['price'])[:1]
        if not affordable_bev:
            affordable_bev = sorted(beverages, key=lambda x: x['price'])[:1]
 
        main = rng.choice(affordable_cp) if affordable_cp else None
        bev  = rng.choice(affordable_bev) if affordable_bev else None
 
        items_chosen = []
        if main: items_chosen.append(main)
        if bev:  items_chosen.append(bev)
 
        total = sum(x['price'] for x in items_chosen)
 
        meals_out.append({
            'label': label,
            'items': items_chosen,
            'total': round(total, 2),
        })
 
    return jsonify({
        'daily_budget': round(daily_budget, 2),
        'meals': meals_out,
    })

@app.route('/calorie')
def calorie():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('calorie.html', username=session.get('username', ''))

@app.route('/api/calorie_profile', methods=['GET'])
def get_calorie_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
 
    db = get_db()
    profile = db.execute(
        "SELECT * FROM calorie_profiles WHERE user_id = ?",
        (session['user_id'],)
    ).fetchone()
    db.close()
 
    if not profile:
        return jsonify({'error': 'No profile found.'}), 404
 
    return jsonify(dict(profile))
 
 
# CALORIE PROFILE — save / update profile
@app.route('/api/calorie_profile', methods=['POST'])
def save_calorie_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
 
    data = request.get_json()
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
        # Upsert — insert on first save, update on subsequent saves
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
            session['user_id'],
            data['gender'],
            int(data['age']),
            float(data['height_cm']),
            float(data['weight_kg']),
            float(data['goal_weight_kg']),
            float(data['activity_multiplier']),
            int(data['speed_kcal']),
            int(data['bmr']),
            int(data['tdee']),
            int(data['target_calories']),
            data['goal_mode'],
            datetime.now().isoformat(),
        ))
        db.commit()
    except Exception:
        db.close()
        return jsonify({'error': 'Database error.'}), 500
 
    db.close()
    return jsonify({'message': 'Profile saved!'}), 200
 
 
# CALORIE TODAY — used by dashboard widget
@app.route('/api/calorie_today')
def api_calorie_today():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401
 
    user_id = session['user_id']
    db = get_db()
 
    # Get saved calorie profile
    profile = db.execute(
        "SELECT target_calories, goal_mode, weight_kg, goal_weight_kg FROM calorie_profiles WHERE user_id = ?",
        (user_id,)
    ).fetchone()
 
    if not profile:
        db.close()
        return jsonify({'has_profile': False}), 200
 
    # Get active session to look up today's logged calories
    sess = db.execute("""
        SELECT id FROM survival_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id,)).fetchone()
 
    calories_today = 0
    if sess:
        today_str = date.today().isoformat()
        row = db.execute("""
            SELECT COALESCE(SUM(calories), 0) AS total
            FROM expense_logs
            WHERE session_id = ? AND logged_at LIKE ?
        """, (sess['id'], today_str + '%')).fetchone()
        calories_today = int(row['total'])
 
    db.close()
 
    return jsonify({
        'has_profile':      True,
        'target_calories':  profile['target_calories'],
        'goal_mode':        profile['goal_mode'],
        'calories_today':   calories_today,
        'weight_kg':        profile['weight_kg'],
        'goal_weight_kg':   profile['goal_weight_kg'],
    })

@app.route('/menu')
def menu():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('menu.html', username=session.get('username', ''))
@app.route('/admin')
def admin():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('admin.html', username=session.get('username', ''))


if __name__ == "__main__":
    app.run(debug=True)
    
