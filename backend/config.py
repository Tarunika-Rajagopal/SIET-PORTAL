from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./siet_portal.db"
    JWT_SECRET_KEY: str = "bafaac41-c5b2-4678-bf10-36b37da179cd"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
