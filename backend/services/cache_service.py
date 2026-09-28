"""
Redis Cache Service with Seamless In-Memory TTL Fallback.
Provides transparent caching for high-frequency queries (e.g. faculties, students, teams)
and user session lookups to prevent hammering the database.
"""
import json
import time
import logging
from typing import Optional, Any, Dict, Tuple

try:
    from config import get_settings
except ImportError:
    from backend.config import get_settings

logger = logging.getLogger("cache_service")
settings = get_settings()

# In-memory storage fallback: {key: (json_string, expire_timestamp)}
_MEMORY_CACHE: Dict[str, Tuple[str, float]] = {}


class CacheService:
    def __init__(self):
        self.redis_client = None
        self._redis_checked = False
        self._is_redis_available = False

    async def _init_redis(self):
        if self._redis_checked:
            return
        self._redis_checked = True

        redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            # Test connectivity
            await client.ping()
            self.redis_client = client
            self._is_redis_available = True
            logger.info(f"[Cache] Connected to Redis at {redis_url}")
            print(f"[Cache] Connected to Redis at {redis_url}")
        except Exception as e:
            self._is_redis_available = False
            self.redis_client = None
            logger.info(f"[Cache] Redis not available ({e}). Using High-Speed In-Memory Cache.")
            print("[Cache] Redis not available. Active mode: In-Memory TTL Cache.")

    async def get_json(self, key: str) -> Optional[Any]:
        """Fetch and deserialize JSON from Redis or in-memory fallback."""
        await self._init_redis()

        if self._is_redis_available and self.redis_client:
            try:
                raw = await self.redis_client.get(key)
                if raw is not None:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"[Cache] Redis get error: {e}, falling back to memory")

        # Memory fallback
        entry = _MEMORY_CACHE.get(key)
        if entry:
            val_str, exp_time = entry
            if time.time() < exp_time:
                return json.loads(val_str)
            else:
                _MEMORY_CACHE.pop(key, None)
        return None

    async def set_json(self, key: str, value: Any, expire_seconds: int = 60) -> bool:
        """Serialize and store value in Redis or in-memory fallback."""
        await self._init_redis()
        serialized = json.dumps(value, default=str)

        if self._is_redis_available and self.redis_client:
            try:
                await self.redis_client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.warning(f"[Cache] Redis set error: {e}, saving to memory")

        # Memory fallback
        _MEMORY_CACHE[key] = (serialized, time.time() + expire_seconds)
        return True

    async def delete(self, key: str) -> bool:
        """Delete specific key from Redis and memory."""
        await self._init_redis()
        _MEMORY_CACHE.pop(key, None)

        if self._is_redis_available and self.redis_client:
            try:
                await self.redis_client.delete(key)
                return True
            except Exception as e:
                logger.warning(f"[Cache] Redis delete error: {e}")
        return True

    async def delete_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching prefix."""
        await self._init_redis()
        # Clean from memory
        keys_to_remove = [k for k in _MEMORY_CACHE.keys() if k.startswith(prefix)]
        for k in keys_to_remove:
            _MEMORY_CACHE.pop(k, None)

        # Clean from Redis if active
        if self._is_redis_available and self.redis_client:
            try:
                cursor = "0"
                while cursor != 0:
                    cursor, keys = await self.redis_client.scan(cursor=cursor, match=f"{prefix}*", count=100)
                    if keys:
                        await self.redis_client.delete(*keys)
            except Exception as e:
                logger.warning(f"[Cache] Redis delete_prefix error: {e}")

        return len(keys_to_remove)

    # Convenience invalidation helpers
    async def invalidate_faculties(self):
        await self.delete_prefix("cache:admin:faculties")
        await self.delete_prefix("cache:advisor:guides")

    async def invalidate_students(self):
        await self.delete_prefix("cache:admin:students")
        await self.delete_prefix("cache:advisor:students")

    async def invalidate_teams(self):
        await self.delete_prefix("cache:teams")
        await self.delete_prefix("cache:advisor:teams")


cache_service = CacheService()
