import sqlite3

conn = sqlite3.connect("brokebite.db")

users = conn.execute("SELECT id, username, role FROM users ORDER BY id").fetchall()
print("Current users:")
for u in users:
    print(f"  id={u[0]}  username={u[1]}  role={u[2]}")

TARGET = "admin"

conn.execute("UPDATE users SET role = 'admin' WHERE username = ?", (TARGET,))
conn.commit()

updated = conn.execute("SELECT id, username, role FROM users WHERE username = ?", (TARGET,)).fetchone()
print(f"\nUpdated: {updated}")
conn.close()