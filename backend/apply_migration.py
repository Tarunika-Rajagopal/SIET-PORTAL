import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)
db_url = os.getenv("DATABASE_URL")
print("Connecting to Supabase DB...")

async def migrate():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        print("1. Adding is_completed column if not exists...")
        await conn.execute(text("ALTER TABLE weekly_submissions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;"))
        
        print("2. Updating completed submissions...")
        res = await conn.execute(text("UPDATE weekly_submissions SET is_completed = TRUE WHERE status IN ('Submitted', 'Approved');"))
        print(f"Updated {res.rowcount} submissions.")

        print("3. Checking column definition...")
        check = await conn.execute(text("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'weekly_submissions' AND column_name = 'is_completed';"))
        row = check.fetchone()
        print(f"Column verified: {row}")
    await engine.dispose()
    print("Migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
