"""
Redis Queue Producer for SIET Background Jobs.
Enqueues jobs safely into Redis or memory fallback, with idempotency & job tracking.
"""
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from job_queue.models import Job, JobStatus
from job_queue.connection import (
    queue_connection,
    _MEMORY_JOBS,
    _MEMORY_PENDING_QUEUE,
    _MEMORY_IDEMPOTENCY,
)

logger = logging.getLogger("job_queue_producer")


def enqueue_job(
    job_type: str,
    payload: Dict[str, Any],
    idempotency_key: Optional[str] = None,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Enqueues a background job into Redis Queue (or memory fallback).
    Returns immediately without blocking the caller.
    """
    r_client = queue_connection.get_redis_client()

    # 1. Idempotency Check
    if idempotency_key:
        existing_job_id = None
        if r_client:
            try:
                existing_job_id = r_client.get(f"queue:idempotency:{idempotency_key}")
            except Exception as e:
                logger.warning(f"[Producer] Redis idempotency get error: {e}")
        else:
            existing_job_id = _MEMORY_IDEMPOTENCY.get(idempotency_key)

        if existing_job_id:
            existing_status = get_job_status(existing_job_id)
            if existing_status:
                logger.info(f"[Producer] Idempotent match for key={idempotency_key}, job_id={existing_job_id}")
                return {
                    "success": True,
                    "message": "Job already queued or completed (idempotent match)",
                    "job_id": existing_job_id,
                    "status": existing_status.get("status"),
                }

    # 2. Generate new job
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    job = Job(
        job_id=job_id,
        job_type=job_type,
        payload=payload,
        status=JobStatus.PENDING,
        max_retries=max_retries,
        idempotency_key=idempotency_key,
    )
    job_data = job.to_dict()

    # 3. Store and push to Queue
    if r_client:
        try:
            pipe = r_client.pipeline()
            pipe.set(f"queue:jobs:{job_id}", json.dumps(job_data))
            pipe.rpush("queue:pending", job_id)
            if idempotency_key:
                pipe.set(f"queue:idempotency:{idempotency_key}", job_id, ex=86400) # 24h
            pipe.execute()
            logger.info(f"JOB QUEUED job_id={job_id} type={job_type}")
        except Exception as e:
            logger.error(f"[Producer] Redis enqueue error: {e}, using memory fallback")
            _MEMORY_JOBS[job_id] = job_data
            _MEMORY_PENDING_QUEUE.append(job_id)
            if idempotency_key:
                _MEMORY_IDEMPOTENCY[idempotency_key] = job_id
    else:
        _MEMORY_JOBS[job_id] = job_data
        _MEMORY_PENDING_QUEUE.append(job_id)
        if idempotency_key:
            _MEMORY_IDEMPOTENCY[idempotency_key] = job_id
        logger.info(f"JOB QUEUED (memory) job_id={job_id} type={job_type}")

    return {
        "success": True,
        "message": "Job queued successfully",
        "job_id": job_id,
        "status": JobStatus.PENDING.value,
    }


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve job metadata and progress by job_id."""
    r_client = queue_connection.get_redis_client()

    if r_client:
        try:
            raw = r_client.get(f"queue:jobs:{job_id}")
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"[Producer] Redis get_job_status error: {e}")

    # Memory fallback
    return _MEMORY_JOBS.get(job_id)


def update_job_status(job_id: str, updates: Dict[str, Any]) -> bool:
    """Update job fields (status, progress, error, result, etc.)."""
    r_client = queue_connection.get_redis_client()

    job_data = get_job_status(job_id)
    if not job_data:
        return False

    job_data.update(updates)

    if r_client:
        try:
            r_client.set(f"queue:jobs:{job_id}", json.dumps(job_data))
            return True
        except Exception as e:
            logger.warning(f"[Producer] Redis update_job_status error: {e}")

    _MEMORY_JOBS[job_id] = job_data
    return True
