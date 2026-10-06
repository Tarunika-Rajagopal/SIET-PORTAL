import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)
db_url = os.getenv("DATABASE_URL")

async def check():
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'weekly_member_marks' 
              AND column_name IN ('system_design', 'presentation_interaction', 'technical_skills', 'implementation_progress', 'mark');
        """))
        rows = res.fetchall()
        print("Verified weekly_member_marks columns in Supabase:")
        for r in rows:
            print(f"  {r[0]}: {r[1]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
