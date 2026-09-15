from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}
