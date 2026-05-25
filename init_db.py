import sqlite3

conn = sqlite3.connect("brokebite.db")
cur = conn.cursor()


# Users table
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student'
)
""")

# Food items table
cur.execute("""
CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    stall TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
)
""")

# Migrate existing DBs: add calories column if it doesn't exist yet
try:
    cur.execute("ALTER TABLE food_items ADD COLUMN calories INTEGER NOT NULL DEFAULT 0")
except Exception:
    pass  # Column already exists — safe to ignore

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
    calories INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES survival_sessions(id)
)
""")

# Migrate existing DBs
try:
    cur.execute("ALTER TABLE expense_logs ADD COLUMN calories INTEGER NOT NULL DEFAULT 0")
except Exception:
    pass  # Column already exists 

# Calorie profiles table
cur.execute("""
CREATE TABLE IF NOT EXISTS calorie_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    weight_kg REAL NOT NULL,
    goal_weight_kg REAL NOT NULL,
    activity_multiplier REAL NOT NULL,
    speed_kcal INTEGER NOT NULL,
    bmr INTEGER NOT NULL,
    tdee INTEGER NOT NULL,
    target_calories INTEGER NOT NULL,
    goal_mode TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")


food_items = [
    # Hajitapah Mamak 
    ("Nasi goreng",              "Hajitapah Mamak", 4.50, "Carbs",    500),
    ("Nasi goreng double",       "Hajitapah Mamak", 6.00, "Carbs",    820),
    ("Nasi goreng cili padi",    "Hajitapah Mamak", 6.00, "Carbs",    520),
    ("Nasi goreng cina",         "Hajitapah Mamak", 5.00, "Carbs",    480),
    ("Nasi goreng kampung",      "Hajitapah Mamak", 6.00, "Carbs",    550),
    ("Nasi goreng ayam",         "Hajitapah Mamak", 8.00, "Carbs",    650),
    ("Nasi goreng kampung ayam", "Hajitapah Mamak", 9.00, "Carbs",    720),
    ("Nasi goreng pattaya",      "Hajitapah Mamak", 6.00, "Carbs",    600),
    ("Maggi",                    "Hajitapah Mamak", 4.50, "Carbs",    380),
    ("Maggi double",             "Hajitapah Mamak", 7.00, "Carbs",    620),
    ("Maggi double ayam",        "Hajitapah Mamak", 10.00, "Carbs",   760),
    ("Mee",                      "Hajitapah Mamak", 4.50, "Carbs",    380),
    ("Bihun",                    "Hajitapah Mamak", 4.50, "Carbs",    350),
    ("Kuey teow",                "Hajitapah Mamak", 4.50, "Carbs",    400),
    ("Mee/nasi goreng",          "Hajitapah Mamak", 4.50, "Carbs",    400),
    ("Kuey teow/bihun goreng",   "Hajitapah Mamak", 4.50, "Carbs",    370),
    ("Rojak",                    "Hajitapah Mamak", 4.50, "Snack",    250),
    ("Rojak biasa",              "Hajitapah Mamak", 5.50, "Snack",    270),
    ("Rojak telur",              "Hajitapah Mamak", 5.50, "Snack",    360),
    ("Rojak mee/mee",            "Hajitapah Mamak", 5.50, "Snack",    380),
    ("Rojak mee + telur",        "Hajitapah Mamak", 5.50, "Snack",    470),
    ("Telur mata",               "Hajitapah Mamak", 1.00, "Protein",   90),
    ("Telur dadar",              "Hajitapah Mamak", 1.50, "Protein",  120),
    ("Roti canai biasa",         "Hajitapah Mamak", 1.20, "Carbs",    170),
    ("Roti telur",               "Hajitapah Mamak", 2.50, "Carbs",    250),
    ("Roti telur bawang",        "Hajitapah Mamak", 3.00, "Carbs",    280),
    ("Roti bawang",              "Hajitapah Mamak", 2.00, "Carbs",    200),
    ("Roti planta",              "Hajitapah Mamak", 2.50, "Carbs",    230),
    ("Roti boom",                "Hajitapah Mamak", 2.50, "Carbs",    280),
    ("Roti cheese",              "Hajitapah Mamak", 3.00, "Carbs",    300),
    ("Roti telur cheese",        "Hajitapah Mamak", 4.00, "Carbs",    380),
    ("Roti sardine",             "Hajitapah Mamak", 4.00, "Protein",  350),
    ("Roti kaya",                "Hajitapah Mamak", 2.50, "Carbs",    220),
    ("Roti madu",                "Hajitapah Mamak", 2.50, "Carbs",    220),
    ("Roti pisang",              "Hajitapah Mamak", 3.00, "Carbs",    250),
    ("Tosai biasa",              "Hajitapah Mamak", 2.00, "Carbs",    150),
    ("Tosai telur",              "Hajitapah Mamak", 3.00, "Carbs",    230),
    ("Tosai bawang",             "Hajitapah Mamak", 3.00, "Carbs",    180),
    ("Tosai masala",             "Hajitapah Mamak", 3.50, "Carbs",    200),
    ("Tosai ghee",               "Hajitapah Mamak", 3.00, "Carbs",    220),
    ("Tosai murtabak",           "Hajitapah Mamak", 4.50, "Carbs",    320),
    ("Tosai capati",             "Hajitapah Mamak", 2.00, "Carbs",    160),
    ("Roti bakar",               "Hajitapah Mamak", 1.50, "Carbs",    140),
    ("Roti bakar telur",         "Hajitapah Mamak", 3.00, "Carbs",    220),
    ("Roti bakar sardin",        "Hajitapah Mamak", 4.00, "Protein",  300),
    ("Teh (panas)",              "Hajitapah Mamak", 1.80, "Beverage",  45),
    ("Teh (ais)",                "Hajitapah Mamak", 2.30, "Beverage",  55),
    ("Teh (bungkus)",            "Hajitapah Mamak", 2.80, "Beverage",  65),
    ("Teh O (panas)",            "Hajitapah Mamak", 1.50, "Beverage",  10),
    ("Teh O (ais)",              "Hajitapah Mamak", 2.00, "Beverage",  15),
    ("Teh O (bungkus)",          "Hajitapah Mamak", 2.30, "Beverage",  20),
    ("Kopi (panas)",             "Hajitapah Mamak", 1.80, "Beverage",  40),
    ("Kopi (ais)",               "Hajitapah Mamak", 2.30, "Beverage",  50),
    ("Kopi (bungkus)",           "Hajitapah Mamak", 2.80, "Beverage",  75),
    ("Kopi O (panas)",           "Hajitapah Mamak", 1.50, "Beverage",  10),
    ("Kopi O (ais)",             "Hajitapah Mamak", 2.00, "Beverage",  15),
    ("Kopi O (bungkus)",         "Hajitapah Mamak", 2.30, "Beverage",  20),
    ("Milo (panas)",             "Hajitapah Mamak", 2.30, "Beverage", 120),
    ("Milo (ais)",               "Hajitapah Mamak", 2.80, "Beverage", 145),
    ("Milo (bungkus)",           "Hajitapah Mamak", 3.30, "Beverage", 165),
    ("Milo O (panas)",           "Hajitapah Mamak", 2.00, "Beverage",  90),
    ("Milo O (ais)",             "Hajitapah Mamak", 2.50, "Beverage", 110),
    ("Milo O (bungkus)",         "Hajitapah Mamak", 3.00, "Beverage", 130),
    ("Nescafe O (panas)",        "Hajitapah Mamak", 2.00, "Beverage",  20),
    ("Nescafe O (ais)",          "Hajitapah Mamak", 2.50, "Beverage",  30),
    ("Nescafe O (bungkus)",      "Hajitapah Mamak", 2.80, "Beverage",  40),
    ("Nescafe (panas)",          "Hajitapah Mamak", 2.30, "Beverage",  60),
    ("Nescafe (ais)",            "Hajitapah Mamak", 2.80, "Beverage",  75),
    ("Nescafe (bungkus)",        "Hajitapah Mamak", 3.30, "Beverage",  90),
    ("Bru (panas)",              "Hajitapah Mamak", 2.50, "Beverage",  80),
    ("Bru (ais)",                "Hajitapah Mamak", 3.00, "Beverage", 100),
    ("Bru (bungkus)",            "Hajitapah Mamak", 3.50, "Beverage", 120),
    ("Horlicks (panas)",         "Hajitapah Mamak", 2.50, "Beverage", 150),
    ("Horlicks (ais)",           "Hajitapah Mamak", 3.00, "Beverage", 170),
    ("Horlicks (bungkus)",       "Hajitapah Mamak", 3.50, "Beverage", 190),
    ("Teh limau",                "Hajitapah Mamak", 1.80, "Beverage",  40),
    ("Air sirap",                "Hajitapah Mamak", 1.80, "Beverage",  80),
    ("Sirap limau",              "Hajitapah Mamak", 1.80, "Beverage",  85),
    ("Jus oren/epal",            "Hajitapah Mamak", 3.50, "Juice",    120),
    ("Jus belimbing",            "Hajitapah Mamak", 3.50, "Juice",     90),
    ("Jus mangga/karot",         "Hajitapah Mamak", 3.50, "Juice",    110),
    ("Jus asam jawa",            "Hajitapah Mamak", 2.80, "Juice",     80),
    ("Jus barli",                "Hajitapah Mamak", 2.80, "Juice",    100),

    # Dapo Sahang 
    ("Nasi goreng biasa",        "Dapo Sahang", 5.00,  "Carbs",   520),
    ("Nasi goreng cina",         "Dapo Sahang", 6.00,  "Carbs",   490),
    ("Nasi goreng kampung",      "Dapo Sahang", 6.50,  "Carbs",   560),
    ("Nasi goreng cili padi",    "Dapo Sahang", 6.00,  "Carbs",   530),
    ("Nasi goreng ayam",         "Dapo Sahang", 8.50,  "Carbs",   670),
    ("Nasi goreng tomyam",       "Dapo Sahang", 7.00,  "Carbs",   580),
    ("Nasi goreng pattaya",      "Dapo Sahang", 7.00,  "Carbs",   620),
    ("Nasi goreng daging",       "Dapo Sahang", 8.00,  "Carbs",   680),
    ("Nasi goreng seafood",      "Dapo Sahang", 8.00,  "Carbs",   600),
    ("Nasi goreng kambing",      "Dapo Sahang", 9.50,  "Carbs",   720),
    ("Nasi goreng ikan masin",   "Dapo Sahang", 7.00,  "Carbs",   560),
    ("Kuey teow goreng",         "Dapo Sahang", 5.00,  "Carbs",   430),
    ("Crispy chicken chop",      "Dapo Sahang", 10.00, "Protein", 550),
    ("Spaghetti aglio olio",     "Dapo Sahang", 12.00, "Carbs",   480),

    # Starbees (Home Sweet Home) 
    ("Yee mee",                  "Starbees(Home Sweet Home)", 6.50, "Carbs", 420),
    ("Spiced fried chicken rice","Starbees(Home Sweet Home)", 7.50, "Carbs", 620),
    ("Braised chicken rice",     "Starbees(Home Sweet Home)", 7.50, "Carbs", 580),
    ("Dry wantan noodles",       "Starbees(Home Sweet Home)", 6.50, "Carbs", 390),
    ("Curry wantan noodles",     "Starbees(Home Sweet Home)", 8.50, "Carbs", 480),

    # Starbees (Tuas anas) 
    ("Maggi Goreng",             "Starbees(Tuas anas)", 5.00, "Carbs", 400),
    ("Nasi Goreng Kampung",      "Starbees(Tuas anas)", 6.00, "Carbs", 560),
    ("Nasi Goreng Ikan Masin",   "Starbees(Tuas anas)", 6.00, "Carbs", 540),
    ("Nasi Goreng Tomyam",       "Starbees(Tuas anas)", 8.00, "Carbs", 590),
    ("Nothing", "How Poor Are You? Even BrokeBite can't save your miserable life.", 0.01, "Carbs", 1), 
    
    # Deen Cafe
    ("Chicken Chop Combo+Rice", "Deen Cafe", 7.00, "Carbs", 750),
("Chicken Chop Combo+Fried Rice", "Deen Cafe", 8.50, "Carbs", 920),
("Roti Bakar", "Deen Cafe", 1.50, "Carbs", 240),
("Sandwich Ayam", "Deen Cafe", 2.50, "Carbs", 290),
("Sandwich Sardin", "Deen Cafe", 2.50, "Carbs", 280),
("Roti John", "Deen Cafe", 5.00, "Carbs", 520),
("Fries", "Deen Cafe", 5.00, "Carbs", 320),
("Wet Fries", "Deen Cafe", 5.50, "Carbs", 450),
("Fish and Chips", "Deen Cafe", 11.00, "Carbs", 780),
("Chicken Chop", "Deen Cafe", 12.00, "Carbs", 680),
("Chicken Grill", "Deen Cafe", 15.00, "Carbs", 550),
("Lamb Chops", "Deen Cafe", 18.00, "Carbs", 620),
("Kuey Tiau Goreng", "Deen Cafe", 5.00, "Carbs", 560),
("Bihun Goreng", "Deen Cafe", 5.00, "Carbs", 480),
("Bihun Singapore", "Deen Cafe", 5.00, "Carbs", 450),
("Mee Goreng", "Deen Cafe", 5.00, "Carbs", 510),
]

cur.executemany("""
INSERT OR REPLACE INTO food_items (name, stall, price, category, calories)
VALUES (?, ?, ?, ?, ?)
""", food_items)

conn.commit()
conn.close()

print("Database updated and synced successfully.")
