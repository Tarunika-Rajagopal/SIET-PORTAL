"""Advisor router - teams, students, guide assignment and reallocation for a class."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.advisor_service import AdvisorService
from services.cache_service import cache_service
from schemas import (
    CreateTeamRequest,
    BulkCreateTeamsRequest,
    MoveStudentRequest,
    ReassignGuideRequest,
    UpdateTeamRequest,
    AdvisorHistoryLogRequest,
)

router = APIRouter(prefix="/api/v1/advisor", tags=["Advisor"])


def get_advisor_service(db: AsyncSession = Depends(get_db)) -> AdvisorService:
    return AdvisorService(db)


@router.get("/available-guides")
async def get_available_guides(
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    cache_key = "cache:advisor:guides"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_available_guides()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.get("/teams")
async def get_teams(
    className: str = "CSE-B",
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = className or user.advisor_class or user.class_name or "CSE-B"
    user_role = (user.role or "").strip().lower()
    if user.advisor_class and user_role not in ["admin", "hod"]:
        if target_class.strip().upper() != user.advisor_class.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Advisor assigned to class {user.advisor_class}, cannot access {target_class}."
            )
    cache_key = f"cache:advisor:teams:{target_class.strip().upper()}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_teams_for_class(target_class)
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.get("/students")
async def get_students(
    className: str = "CSE-B",
    batch: str = "2023-2027 (III Year)",
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = className or user.advisor_class or user.class_name or "CSE-B"
    target_batch = batch or user.advisor_batch or user.batch or "2023-2027 (III Year)"
    user_role = (user.role or "").strip().lower()
    if user.advisor_class and user_role not in ["admin", "hod"]:
        if target_class.strip().upper() != user.advisor_class.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Advisor assigned to class {user.advisor_class}, cannot access {target_class}."
            )
    cache_key = f"cache:advisor:students:{target_class.strip().upper()}:{target_batch.strip()}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_class_students(target_class, target_batch)
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.post("/teams")
async def create_team(
    req: CreateTeamRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = req.className or user.advisor_class or user.class_name or "CSE-B"
    user_role = (user.role or "").strip().lower()
    if user.advisor_class and user_role not in ["admin", "hod"]:
        if target_class.strip().upper() != user.advisor_class.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Advisor assigned to class {user.advisor_class}, cannot access {target_class}."
            )
    result = await service.create_team(
        req.className,
        req.batch,
        req.capacity,
        req.teamNo,
        req.title,
        req.guide,
        req.guideEmail,
        req.leadRollNo,
        req.memberRollNos,
    )
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    return result


@router.post("/teams/bulk")
async def create_teams_bulk(
    req: BulkCreateTeamsRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = req.className or user.advisor_class or user.class_name or "CSE-B"
    user_role = (user.role or "").strip().lower()
    if user.advisor_class and user_role not in ["admin", "hod"]:
        if target_class.strip().upper() != user.advisor_class.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Advisor assigned to class {user.advisor_class}, cannot access {target_class}."
            )
    result = await service.create_teams_bulk(
        req.className,
        req.batch,
        req.capacity,
        [t.dict() for t in req.teams],
    )
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    return result


@router.post("/move-student")
async def move_student(
    req: MoveStudentRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    result = await service.move_student(
        req.className,
        req.studentRollNo,
        req.targetTeamId,
    )
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    return result


@router.post("/reassign-guide")
async def reassign_guide(
    req: ReassignGuideRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    result = await service.reassign_guide(
        req.className,
        req.teamId,
        req.guideName,
        req.guideEmail or "",
    )
    await cache_service.invalidate_teams()
    return result


@router.put("/teams/{team_id}")
async def update_team(
    team_id: str,
    req: UpdateTeamRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    result = await service.update_team(
        req.className,
        req.batch,
        team_id,
        req.dict(exclude_unset=True),
    )
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    return result


@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    result = await service.delete_team(team_id)
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    return result


@router.get("/history")
async def get_history(
    className: str = "CSE-B",
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = className or user.advisor_class or user.class_name or "CSE-B"
    return await service.get_advisor_history(target_class)


@router.post("/history")
async def log_history(
    req: AdvisorHistoryLogRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "hod")),
    service: AdvisorService = Depends(get_advisor_service),
):
    target_class = req.className or user.advisor_class or user.class_name or "CSE-B"
    return await service.log_advisor_history(
        class_section=target_class,
        action_type=req.actionType,
        target=req.target,
        details=req.details,
        actor_name=req.actorName or user.name or "Class Advisor",
        role=req.role or "Class Advisor",
    )
