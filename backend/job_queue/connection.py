"""
Redis Queue Connection Manager with High-Performance Fallback.
Reuses existing Redis settings (REDIS_URL) without duplicating infrastructure.
"""
import os
import json
import time
import logging
from typing import Optional, Dict, Any, Tuple
import redis

try:
    from config import settings
except ImportError:
    from backend.config import settings

logger = logging.getLogger("job_queue_connection")

REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

_MEMORY_JOBS: Dict[str, Dict[str, Any]] = {}
_MEMORY_PENDING_QUEUE: list = []
_MEMORY_IDEMPOTENCY: Dict[str, str] = {}


class QueueConnection:
    def __init__(self):
        self._sync_redis: Optional[redis.Redis] = None
        self._checked = False
        self._is_available = False

    def get_redis_client(self) -> Optional[redis.Redis]:
        """Returns synchronous Redis client if available, or None for memory fallback."""
        if self._checked:
            return self._sync_redis if self._is_available else None

        self._checked = True
        try:
            r = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            r.ping()
            self._sync_redis = r
            self._is_available = True
            logger.info(f"[JobQueue] Connected to Redis at {REDIS_URL}")
            print(f"[JobQueue] Redis Queue initialized at {REDIS_URL}")
        except Exception as e:
            self._sync_redis = None
            self._is_available = False
            logger.info(f"[JobQueue] Redis server not available ({e}). Active mode: High-Speed In-Memory Queue.")
            print("[JobQueue] Redis server offline. Active mode: In-Memory Background Queue.")

        return self._sync_redis if self._is_available else None

    @property
    def is_redis_available(self) -> bool:
        self.get_redis_client()
        return self._is_available


queue_connection = QueueConnection()
