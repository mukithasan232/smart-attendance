import os
from sqlalchemy import create_engine, text
from backend.core.config import DATABASE_URL

print(f"Connecting to: {DATABASE_URL.split('@')[1]}")

engine = create_engine(DATABASE_URL)

try:
    with open('supabase/migrations/0001_initial_schema.sql', 'r') as f:
        sql = f.read()

    with engine.begin() as conn:
        conn.execute(text(sql))

    print("Migration applied successfully!")
except Exception as e:
    print(f"Migration failed: {e}")
