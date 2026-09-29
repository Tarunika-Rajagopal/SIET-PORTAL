"""
Standalone Redis Background Worker Process for SIET Portal.
Continuously consumes jobs from Redis Queue (or memory fallback), executes processors,
handles errors, performs exponential backoff retries, and shuts down gracefully.

Usage:
    python -m workers.worker
"""
import sys
import time
import signal
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from job_queue.connection import queue_connection, _MEMORY_PENDING_QUEUE
from job_queue.models import JobStatus
from job_queue.producer import get_job_status, update_job_status
from jobs.registry import get_job_handler, JOB_REGISTRY

# Configure structured logging for worker
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Worker] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("worker")

_RUNNING = True


def handle_shutdown_signal(signum, frame):
    global _RUNNING
    signal_name = signal.Signals(signum).name if hasattr(signal, "Signals") else str(signum)
    logger.info(f"Received {signal_name}. Initiating graceful worker shutdown...")
    _RUNNING = False


def fetch_next_job_id() -> Optional[str]:
    """Fetch next job_id from Redis Queue (BLPOP) or memory fallback queue."""
    r_client = queue_connection.get_redis_client()

    if r_client:
        try:
            res = r_client.blpop("queue:pending", timeout=1)
            if res:
                # res is tuple (queue_name, job_id)
                return res[1]
        except Exception as e:
            logger.warning(f"Redis fetch error: {e}")

    # Memory fallback queue
    if _MEMORY_PENDING_QUEUE:
        return _MEMORY_PENDING_QUEUE.pop(0)

    return None


def re_enqueue_job(job_id: str, delay_seconds: float = 0):
    """Re-enqueue a failed job for retry after backoff delay."""
    if delay_seconds > 0:
        time.sleep(delay_seconds)

    r_client = queue_connection.get_redis_client()
    if r_client:
        try:
            r_client.rpush("queue:pending", job_id)
            return
        except Exception as e:
            logger.warning(f"Redis re-enqueue error: {e}")

    _MEMORY_PENDING_QUEUE.append(job_id)


def process_job(job_id: str):
    """Process a single background job by job_id."""
    job_data = get_job_status(job_id)
    if not job_data:
        logger.warning(f"Job data missing for job_id={job_id}, skipping.")
        return

    job_type = job_data.get("job_type")
    payload = job_data.get("payload", {})
    retry_count = job_data.get("retry_count", 0)
    max_retries = job_data.get("max_retries", 3)

    start_time = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Update status to PROCESSING
    update_job_status(job_id, {
        "status": JobStatus.PROCESSING.value,
        "started_at": now_iso,
        "progress": 15,
    })
    logger.info(f"JOB STARTED job_id={job_id} type={job_type} (retry {retry_count}/{max_retries})")

    # 2. Look up handler
    try:
        handler = get_job_handler(job_type)
    except ValueError as val_err:
        logger.error(f"JOB FAILED job_id={job_id} error={val_err}")
        update_job_status(job_id, {
            "status": JobStatus.FAILED.value,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error": str(val_err),
        })
        return

    # 3. Execute Handler
    try:
        result = handler(payload)
        duration = round(time.time() - start_time, 3)

        update_job_status(job_id, {
            "status": JobStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "progress": 100,
            "result": result,
            "error": None,
        })
        logger.info(f"JOB COMPLETED job_id={job_id} type={job_type} duration={duration}s")

    except Exception as exc:
        duration = round(time.time() - start_time, 3)
        err_msg = str(exc)
        logger.error(f"JOB FAILED job_id={job_id} error={err_msg} duration={duration}s")

        new_retry_count = retry_count + 1
        if new_retry_count <= max_retries:
            backoff_delay = 2 ** new_retry_count  # 2s, 4s, 8s exponential backoff
            logger.info(f"JOB RETRYING job_id={job_id} retry={new_retry_count}/{max_retries} backoff={backoff_delay}s")

            update_job_status(job_id, {
                "status": JobStatus.RETRYING.value,
                "retry_count": new_retry_count,
                "error": f"Attempt {new_retry_count} failed: {err_msg}",
            })
            re_enqueue_job(job_id, delay_seconds=backoff_delay)
        else:
            logger.error(f"JOB MAX RETRIES EXHAUSTED job_id={job_id} max_retries={max_retries}")
            update_job_status(job_id, {
                "status": JobStatus.FAILED.value,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error": f"Max retries ({max_retries}) exhausted. Last error: {err_msg}",
            })


def start_worker():
    """Main worker loop."""
    # Register signal handlers for graceful exit
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    logger.info("==================================================")
    logger.info("  SIET Portal Background Worker Started")
    logger.info(f"  Redis URL: {queue_connection.is_redis_available and 'Connected' or 'Using Memory Fallback'}")
    logger.info(f"  Registered Jobs: {list(JOB_REGISTRY.keys())}")
    logger.info("  Press Ctrl+C to shut down gracefully.")
    logger.info("==================================================")

    while _RUNNING:
        try:
            job_id = fetch_next_job_id()
            if job_id:
                process_job(job_id)
            else:
                time.sleep(0.5)
        except Exception as e:
            logger.error(f"Worker loop exception: {e}")
            time.sleep(1.0)

    logger.info("Worker process stopped cleanly. Goodbye.")


if __name__ == "__main__":
    start_worker()
