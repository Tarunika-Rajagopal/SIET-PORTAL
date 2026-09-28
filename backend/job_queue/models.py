"""
Queue Models and Schemas for SIET Background Jobs.
"""
import enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class Job(BaseModel):
    job_id: str
    job_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    status: JobStatus = JobStatus.PENDING
    progress: int = 0
    retry_count: int = 0
    max_retries: int = 3
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "payload": self.payload,
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "progress": self.progress,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "error": self.error,
            "result": self.result,
            "idempotency_key": self.idempotency_key,
        }
