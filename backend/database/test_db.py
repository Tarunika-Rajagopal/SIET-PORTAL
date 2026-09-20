import sys
import os
import asyncio

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database.database import async_session
from sqlalchemy import text

async def main():
    async with async_session() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        tables = [row[0] for row in result.fetchall()]
        print("Tables in public schema:", tables)
        
        for table in tables:
            try:
                count_res = await session.execute(text(f'SELECT COUNT(*) FROM "{table}";'))
                print(f"  Table '{table}': {count_res.scalar()} rows")
            except Exception as e:
                print(f"  Table '{table}': Error - {e}")

if __name__ == "__main__":
    asyncio.run(main())
