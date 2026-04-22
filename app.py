from flask import Flask
from database import get_db

app = Flask(__name__)
app.secret_key = "change-this-to-something-random-later"

@app.route("/")
def index():
    return "BrokeBite is alive."

@app.route("/test-db")
def test_db():
    db = get_db()
    items = db.execute("SELECT * FROM food_items").fetchall()
    db.close()
    result = ""
    for item in items:
        result += f"{item['name']} - RM {item['price']}<br>"
    return result

if __name__ == "__main__":
    app.run(debug=True)