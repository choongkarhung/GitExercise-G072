import sqlite3

conn = sqlite3.connect("brokebite.db")
cur = conn.cursor()

# Users table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id  INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student'
)
""")

# Food items table
cur.execute("""
CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stall TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
)
""")

# Survival sessions table
cur.execute("""
CREATE TABLE IF NOT EXISTS survival_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_balance REAL NOT NULL,
    days_total INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")

# Expense logs table
cur.execute("""
CREATE TABLE IF NOT EXISTS expense_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    label TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES survival_sessions(id)
)
""")

# Food menu seeding
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
("Roti canai biasa", "Hajitapah Mamak", 1.20, "Carbs"),
("Roti telur", "Hajitapah Mamak", 2.50, "Carbs"),
("Roti telur bawang", "Hajitapah Mamak", 3.00, "Carbs"),
("Roti bawang", "Hajitapah Mamak", 2.00, "Carbs"),
("Roti planta", "Hajitapah Mamak", 2.50, "Carbs"),
("Roti boom", "Hajitapah Mamak", 2.50, "Carbs"),
("Roti cheese", "Hajitapah Mamak", 3.00, "Carbs"),
("Roti telur cheese", "Hajitapah Mamak", 4.00, "Carbs"),
("Roti sardine", "Hajitapah Mamak", 4.00, "Protein"),
("Roti kaya", "Hajitapah Mamak", 2.50, "Carbs"),
("Roti madu", "Hajitapah Mamak", 2.50, "Carbs"),
("Roti pisang", "Hajitapah Mamak", 3.00, "Carbs"),
("Tosai biasa", "Hajitapah Mamak", 2.00, "Carbs"),
("Tosai telur", "Hajitapah Mamak", 3.00, "Carbs"),
("Tosai bawang", "Hajitapah Mamak", 3.00, "Carbs"),
("Tosai masala", "Hajitapah Mamak", 3.50, "Carbs"),
("Tosai ghee", "Hajitapah Mamak", 3.00, "Carbs"),
("Tosai murtabak", "Hajitapah Mamak", 4.50, "Carbs"),
("Tosai capati", "Hajitapah Mamak", 2.00, "Carbs"),
("Roti bakar", "Hajitapah Mamak", 1.50, "Carbs"),
("Roti bakar telur", "Hajitapah Mamak", 3.00, "Carbs"),
("Roti bakar sardin", "Hajitapah Mamak", 4.00, "Protein"),
("Teh (panas)", "Hajitapah Mamak", 1.80, "Beverage"),
("Teh (ais)", "Hajitapah Mamak", 2.30, "Beverage"),
("Teh (bungkus)", "Hajitapah Mamak", 2.80, "Beverage"),
("Teh O (panas)", "Hajitapah Mamak", 1.50, "Beverage"),
("Teh O (ais)", "Hajitapah Mamak", 2.00, "Beverage"),
("Teh O (bungkus)", "Hajitapah Mamak", 2.30, "Beverage"),
("Kopi (panas)", "Hajitapah Mamak", 1.80, "Beverage"),
("Kopi (ais)", "Hajitapah Mamak", 2.30, "Beverage"),
("Kopi (bungkus)", "Hajitapah Mamak", 2.80, "Beverage"),
("Kopi O (panas)", "Hajitapah Mamak", 1.50, "Beverage"),
("Kopi O (ais)", "Hajitapah Mamak", 2.00, "Beverage"),
("Kopi O (bungkus)", "Hajitapah Mamak", 2.30, "Beverage"),
("Milo (panas)", "Hajitapah Mamak", 2.30, "Beverage"),
("Milo (ais)", "Hajitapah Mamak", 2.80, "Beverage"),
("Milo (bungkus)", "Hajitapah Mamak", 3.30, "Beverage"),
("Milo O (panas)", "Hajitapah Mamak", 2.00, "Beverage"),
("Milo O (ais)", "Hajitapah Mamak", 2.50, "Beverage"),
("Milo O (bungkus)", "Hajitapah Mamak", 3.00, "Beverage"),
("Nescafe O (panas)", "Hajitapah Mamak", 2.00, "Beverage"),
("Nescafe O (ais)", "Hajitapah Mamak", 2.50, "Beverage"),
("Nescafe O (bungkus)", "Hajitapah Mamak", 2.80, "Beverage"),
("Nescafe (panas)", "Hajitapah Mamak", 2.30, "Beverage"),
("Nescafe (ais)", "Hajitapah Mamak", 2.80, "Beverage"),
("Nescafe (bungkus)", "Hajitapah Mamak", 3.30, "Beverage"),
("Bru (panas)", "Hajitapah Mamak", 2.50, "Beverage"),
("Bru (ais)", "Hajitapah Mamak", 3.00, "Beverage"),
("Bru (bungkus)", "Hajitapah Mamak", 3.50, "Beverage"),
("Horlicks (panas)", "Hajitapah Mamak", 2.50, "Beverage"),
("Horlicks (ais)", "Hajitapah Mamak", 3.00, "Beverage"),
("Horlicks (bungkus)", "Hajitapah Mamak", 3.50, "Beverage"),
("Teh limau", "Hajitapah Mamak", 1.80, "Beverage"),
("Air sirap", "Hajitapah Mamak", 1.80, "Beverage"),
("Sirap limau", "Hajitapah Mamak", 1.80, "Beverage"),
("Jus oren/epal", "Hajitapah Mamak", 3.50, "Juice"),
("Jus belimbing", "Hajitapah Mamak", 3.50, "Juice"),
("Jus mangga/karot", "Hajitapah Mamak", 3.50, "Juice"),
("Jus asam jawa", "Hajitapah Mamak", 2.80, "Juice"),
("Jus barli", "Hajitapah Mamak", 2.80, "Juice")
]

cur.executemany("""
INSERT INTO food_items (name, stall, price, category)
VALUES (?, ?, ?, ?)
""", food_items)

conn.commit()
conn.close()

print("Database created and seeded successfully.")