import sqlite3

conn = sqlite3.connect("brokebite.db")
cur = conn.cursor()

# Users table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student'
)
""")

# Food items table
cur.execute("""
CREATE TABLE IF NOT EXISTS food_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    stall     TEXT NOT NULL,
    price     REAL NOT NULL,
    category  TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
)
""")

# Survival sessions table
cur.execute("""
CREATE TABLE IF NOT EXISTS survival_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    start_balance REAL NOT NULL,
    days_total    INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")

# Expense logs table
cur.execute("""
CREATE TABLE IF NOT EXISTS expense_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    amount     REAL NOT NULL,
    label      TEXT NOT NULL,
    logged_at  TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES survival_sessions(id)
)
""")

# Seed food items
food_items = [
("Nasi goreng", "Hajitapah Mamak", 4.50, "Carbs"),
("Nasi goreng double", "Hajitapah Mamak", 6.00, "Carbs"),
("Nasi goreng cili padi", "Hajitapah Mamak", 6.00, "Carbs"),
("Nasi goreng cina", "Hajitapah Mamak", 5.00, "Carbs"),
("Nasi goreng kampung", "Hajitapah Mamak", 6.00, "Carbs"),
("Nasi goreng ayam", "Hajitapah Mamak", 8.00, "Carbs"),
("Nasi goreng kampung ayam", "Hajitapah Mamak", 9.00, "Carbs"),
("Nasi goreng pattaya", "Hajitapah Mamak", 6.00, "Carbs"),
("Maggi", "Hajitapah Mamak", 4.50, "Carbs"),
("Maggi double", "Hajitapah Mamak", 7.00, "Carbs"),
("Maggi double ayam", "Hajitapah Mamak", 10.00, "Carbs"),
("Mee", "Hajitapah Mamak", 4.50, "Carbs"),
("Bihun", "Hajitapah Mamak", 4.50, "Carbs"),
("Kuey teow", "Hajitapah Mamak", 4.50, "Carbs"),
("Rojak", "Hajitapah Mamak", 4.50, "Snack"),
("Telur mata", "Hajitapah Mamak", 1.00, "Protein"),
("Telur dadar", "Hajitapah Mamak", 1.50, "Protein"),
("Mee/nasi goreng", "Hajitapah Mamak", 4.50, "Carbs"),
("Kuey teow/bihun goreng", "Hajitapah Mamak", 4.50, "Carbs"),
("Rojak biasa", "Hajitapah Mamak", 5.50, "Snack"),
("Rojak telur", "Hajitapah Mamak", 5.50, "Snack"),
("Rojak mee/mee", "Hajitapah Mamak", 5.50, "Snack"),
("Rojak mee + telur", "Hajitapah Mamak", 5.50, "Snack"),

]

cur.executemany("""
INSERT INTO food_items (name, stall, price, category)
VALUES (?, ?, ?, ?)
""", food_items)

conn.commit()
conn.close()

print("Database created and seeded successfully.")