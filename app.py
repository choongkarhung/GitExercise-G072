import os
from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db

app = Flask(__name__)

# SECURE KEY: Essential for sessions to work
app.secret_key = os.environ.get('SECRET_KEY', 'mmu_broke_student_secret_2024')

# --- VIEW ROUTES ---

@app.route('/')
def home():
    # Logic: If logged in, go to dashboard. If not, show login (index.html)
    if 'username' in session:
        return redirect(url_for('dashboard.html'))
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    # Protection: Redirect to login if user tries to access dashboard directly
    if 'username' not in session:
        return redirect(url_for('home'))
    return render_template('dashboard.html', username=session['username'])


# --- AUTHENTICATION API ROUTES ---

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

    # Secure Hashing (PBKDF2 is the default in newer Werkzeug)
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


if __name__ == "__main__":
    app.run(debug=True)