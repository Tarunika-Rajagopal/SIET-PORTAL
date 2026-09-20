from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    JWT_SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    model_config = {
        "env_file": [".env", "backend/.env"],
        "extra": "ignore"
    }


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
