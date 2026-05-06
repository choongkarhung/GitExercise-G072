import os
from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
from datetime import datetime, date

app = Flask(__name__)

# SECURE KEY
app.secret_key = os.environ.get('SECRET_KEY', 'mmu_broke_student_secret_2024')

@app.route('/')
def home():
    if 'username' in session:
        return redirect(url_for('setup'))
    return render_template('login.html')

@app.route('/setup', methods=['GET'])
def setup():
    if 'user_id' not in session:
        return redirect(url_for('home'))
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

    data   = request.get_json()
    label  = data.get('label', '').strip()
    amount = data.get('amount')

    if not label:
        return jsonify({'error': 'Description is required.'}), 400
    if not amount or float(amount) <= 0:
        return jsonify({'error': 'Amount must be greater than 0.'}), 400

    db = get_db()

    # Get the latest session for this user
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
            INSERT INTO expense_logs (session_id, amount, label, logged_at)
            VALUES (?, ?, ?, ?)
        """, (sess['id'], float(amount), label, datetime.now().isoformat()))
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
        SELECT name, stall, price, category
        FROM food_items
        WHERE is_active = 1 AND price <= ?
        ORDER BY price ASC
        LIMIT 15
    """, (daily_budget,)).fetchall()

    db.close()
    return jsonify([dict(m) for m in meals])


if __name__ == "__main__":
    app.run(debug=True)