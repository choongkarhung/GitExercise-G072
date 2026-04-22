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
    ("Roti canai",              "Hajitapah Mamak",  1.20, "Carbs"),
    ("Roti telur",              "Hajitapah Mamak",  1.80, "Carbs"),
    ("Roti canai + teh o",      "Hajitapah Mamak",  2.00, "Carbs"),
    ("Teh o ais",               "Hajitapah Mamak",  1.50, "Drink"),
    ("Milo O panas",            "Hajitapah Mamak",  1.50, "Drink"),
    ("Maggi goreng",            "Hajitapah Mamak",  4.50, "Carbs"),
    ("Nasi lemak bungkus",      "MMU Cafe",         3.00, "Carbs"),
    ("Nasi campur 1 lauk",      "MMU Cafe",         4.50, "Carbs"),
    ("Milo O ais",              "MMU Cafe",         2.00, "Drink"),
    ("Air kosong",              "MMU Cafe",         0.50, "Drink"),
    ("Onigiri tuna mayo",       "FamilyMart",       4.50, "Protein"),
    ("Onigiri salmon",          "FamilyMart",       4.90, "Protein"),
    ("Maggi cup Hot & Spicy",   "FamilyMart",       2.90, "Carbs"),
    ("Maggi cup Chicken",       "FamilyMart",       2.90, "Carbs"),
    ("Bread (Gardenia white)",  "FamilyMart",       2.50, "Carbs"),
    ("100Plus can",             "FamilyMart",       2.30, "Drink"),
    ("Mineral water 500ml",     "FamilyMart",       1.00, "Drink"),
    ("Nasi lemak (FM)",         "FamilyMart",       4.80, "Carbs"),
    ("Egg sandwich",            "FamilyMart",       3.50, "Protein"),
    ("Banana",                  "FamilyMart",       0.80, "Snack"),
]

cur.executemany("""
INSERT INTO food_items (name, stall, price, category)
VALUES (?, ?, ?, ?)
""", food_items)

conn.commit()
conn.close()

print("Database created and seeded successfully.")