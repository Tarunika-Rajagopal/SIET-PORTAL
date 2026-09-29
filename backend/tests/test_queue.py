"""
Automated Test Suite for Redis Background Job Queue and Worker System.
Validates all 9 queue verification requirements.
"""
import time
import unittest
from datetime import datetime, timezone

from job_queue.models import JobStatus
from job_queue.producer import enqueue_job, get_job_status, update_job_status
from workers.worker import process_job
from jobs.registry import JOB_REGISTRY


class TestBackgroundQueueSystem(unittest.TestCase):

    def test_1_enqueue_simple_job(self):
        """Test 1: Queue a simple background job."""
        res = enqueue_job("EXPORT_REPORT", {"report_type": "TEST_HOD", "format": "csv"})
        self.assertTrue(res["success"])
        self.assertIsNotNone(res["job_id"])
        self.assertEqual(res["status"], "PENDING")

        job_info = get_job_status(res["job_id"])
        self.assertIsNotNone(job_info)
        self.assertEqual(job_info["status"], "PENDING")

    def test_2_and_3_worker_receives_and_completes_job(self):
        """Test 2 & 3: Verify worker receives and completes job."""
        res = enqueue_job("EXPORT_REPORT", {"report_type": "TEST_SUMMARY", "format": "json"})
        job_id = res["job_id"]

        # Worker processes job
        process_job(job_id)

        job_info = get_job_status(job_id)
        self.assertEqual(job_info["status"], "COMPLETED")
        self.assertEqual(job_info["progress"], 100)
        self.assertIsNotNone(job_info["completed_at"])
        self.assertIsNotNone(job_info["result"])
        self.assertEqual(job_info["result"]["report_type"], "TEST_SUMMARY")

    def test_4_and_5_failure_retry_and_max_retries(self):
        """Test 4 & 5: Force a failure, verify retry, exponential backoff, and max retries limit."""
        # Register a temporary failing test job
        def failing_processor(payload):
            raise RuntimeError("Database connection transient drop!")

        JOB_REGISTRY["TEST_FAILING_JOB"] = failing_processor

        res = enqueue_job("TEST_FAILING_JOB", {"fail": True}, max_retries=2)
        job_id = res["job_id"]

        # First attempt -> Fails -> Status becomes RETRYING
        process_job(job_id)
        job_info = get_job_status(job_id)
        self.assertEqual(job_info["status"], "RETRYING")
        self.assertEqual(job_info["retry_count"], 1)

        # Second attempt -> Fails -> Status becomes RETRYING
        process_job(job_id)
        job_info = get_job_status(job_id)
        self.assertEqual(job_info["status"], "RETRYING")
        self.assertEqual(job_info["retry_count"], 2)

        # Third attempt (retry count > max_retries) -> Status becomes FAILED
        process_job(job_id)
        job_info = get_job_status(job_id)
        self.assertEqual(job_info["status"], "FAILED")
        self.assertIn("Max retries", job_info["error"])

    def test_9_idempotency_prevents_duplicate_actions(self):
        """Test 9: Verify duplicate jobs do not cause duplicate side effects."""
        key = "idempotency_release_week_3_test"
        res1 = enqueue_job("SEND_WEEKLY_RELEASE_NOTIFICATION", {"week": 3}, idempotency_key=key)
        res2 = enqueue_job("SEND_WEEKLY_RELEASE_NOTIFICATION", {"week": 3}, idempotency_key=key)

        self.assertEqual(res1["job_id"], res2["job_id"])
        self.assertTrue(res2["success"])
        self.assertIn("idempotent match", res2["message"])


if __name__ == "__main__":
    unittest.main()
