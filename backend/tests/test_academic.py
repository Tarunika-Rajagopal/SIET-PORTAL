import pytest
from httpx import AsyncClient
from app.core.database import AsyncSessionLocal
from app.repositories.academic_repository import AcademicRepository

@pytest.mark.asyncio
async def test_get_current_academic_week(client: AsyncClient):
    response = await client.get("/api/v1/academic/current-week")
    assert response.status_code == 200
    data = response.json()
    assert "weekNumber" in data
    assert data["weekNumber"] == 6
    assert data["isCurrent"] is True

@pytest.mark.asyncio
async def test_single_current_week_enforcement():
    async with AsyncSessionLocal() as db:
        repo = AcademicRepository(db)
        # Create new week 7 set as current
        w7 = await repo.create_academic_week(week_number=7, is_current=True)
        curr = await repo.get_current_academic_week()
        assert curr.week_number == 7

        # Restore week 6 as current for test consistency
        await repo.create_academic_week(week_number=6, is_current=True)
        await db.commit()
