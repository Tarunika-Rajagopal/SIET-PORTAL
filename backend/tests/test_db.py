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

        result = await session.execute(
            text("SELECT * FROM users")
        )

        rows = result.fetchall()

        print("Users:")
        for row in rows:
            print(row)


if __name__ == "__main__":
    asyncio.run(main())
