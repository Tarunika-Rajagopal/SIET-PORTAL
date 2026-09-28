"""
Job Router - endpoints for querying background job status and submitting export jobs.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from job_queue.producer import enqueue_job, get_job_status

router = APIRouter(prefix="/api/v1/jobs", tags=["Background Jobs"])


class ExportJobRequest(BaseModel):
    reportType: str = "HOD_SUMMARY"
    format: str = "csv"


@router.get("/{job_id}")
async def get_job_info(job_id: str):
    """Retrieve job execution status, progress, and results."""
    info = get_job_status(job_id)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    return info


@router.post("/export")
async def create_export_job(req: ExportJobRequest):
    """Enqueue a long-running report export job and return job_id immediately."""
    result = enqueue_job(
        job_type="EXPORT_REPORT",
        payload={
            "report_type": req.reportType,
            "format": req.format,
        },
    )
    return result
