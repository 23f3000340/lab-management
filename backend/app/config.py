from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./lab_tracker.db"
    SECRET_KEY: str = "change-me-in-production-use-32-chars-minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ADMIN_EMAIL: str = "admin@lab.local"
    ADMIN_PASSWORD: str = "admin123"
    STUCK_TICKET_DAYS: int = 3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
