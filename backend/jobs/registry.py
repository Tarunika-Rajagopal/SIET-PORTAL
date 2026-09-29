"""
Job Registry mapping job_type strings to background processor functions.
"""
from typing import Callable, Dict, Any

from jobs.notifications import process_weekly_release_notification
from jobs.exports import process_export_report
from jobs.bulk import process_bulk_operation

JOB_REGISTRY: Dict[str, Callable[[Dict[str, Any]], Dict[str, Any]]] = {
    "SEND_WEEKLY_RELEASE_NOTIFICATION": process_weekly_release_notification,
    "EXPORT_REPORT": process_export_report,
    "BULK_OPERATION": process_bulk_operation,
}


def get_job_handler(job_type: str) -> Callable[[Dict[str, Any]], Dict[str, Any]]:
    """Look up job processor function by job_type."""
    if job_type not in JOB_REGISTRY:
        raise ValueError(f"Unknown job type: '{job_type}'. Registered job types: {list(JOB_REGISTRY.keys())}")
    return JOB_REGISTRY[job_type]
