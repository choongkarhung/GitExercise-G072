import os
from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
from datetime import datetime

app = Flask(__name__)

# SECURE KEY
app.secret_key = os.environ.get('SECRET_KEY', 'mmu_broke_student_secret_2024')

# --- VIEW ROUTES ---

@app.route('/')
def home():
    # If logged in, go to dashboard. If not, show login 
    if 'username' in session:
        return redirect(url_for('setup.html'))
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    # Redirect to login if user tries to access dashboard directly
    if 'username' not in session:
        return redirect(url_for('home'))
    return render_template('setup.html', username=session['username'])


# AUTHENTICATION

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Please provide both username and password'}), 400

    db = get_db()
    # Check if user already exists in brokebite.db
    user_check = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    
    if user_check:
        db.close()
        return jsonify({'error': 'Username already exists!'}), 400

    # Secure Hashing 
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

    # Compare submitted password with the hash in the database
    if user and check_password_hash(user['password_hash'], password):
        session.clear()
        session['username'] = user['username']
        session['user_id'] = user['id']
        return jsonify({'message': 'Login successful!'}), 200
    
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/setup', methods=['GET'])
def setup():
    # Block logged-out users from accessing this page
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('setup.html')


@app.route('/setup', methods=['POST'])
def setup_post():
    # Block logged-out users
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in.'}), 401

    data = request.get_json()
    balance = data.get('balance')
    days = data.get('days')

    # Server-side validation
    if not balance or float(balance) <= 0:
        return jsonify({'error': 'Invalid balance.'}), 400
    if not days or int(days) <= 0:
        return jsonify({'error': 'Invalid number of days.'}), 400

    db = get_db()

    # Save the new survival session to the database
    db.execute("""
        INSERT INTO survival_sessions (user_id, start_balance, days_total, created_at)
        VALUES (?, ?, ?, ?)
    """, (session['user_id'], float(balance), int(days), datetime.now().isoformat()))

    db.commit()

    # Store balance and days in Flask session so dashboard can read them
    session['balance'] = float(balance)
    session['days'] = int(days)

    db.close()

    return jsonify({'message': 'Session created.'}), 200

if __name__ == "__main__":
    app.run(debug=True)