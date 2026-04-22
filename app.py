import os
from flask import Flask, session, redirect, url_for
from database import get_db

app = Flask(__name__)

app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key_12345')

@app.route("/")
def index():
    # Check if a user is logged in
    if 'user_id' in session:
        return f"Welcome back, #{session['user_id']}!"
    return "Welcome to BrokeBite! Please log in to track your budget."

@app.route("/test-db")
def test_db():
    db = get_db()
    # Using the connection to fetch seeded items from init_db.py
    items = db.execute("SELECT * FROM food_items").fetchall()
    db.close()
    
    if not items:
        return "Database is empty. Did you run init_db.py?"

    result = "<h3>BrokeBite Menu</h3>"
    for item in items:
        result += f"{item['name']} - RM {item['price']:.2f} ({item['stall']})<br>"
    return result

# Logging out
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(debug=True)