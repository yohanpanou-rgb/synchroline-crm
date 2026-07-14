from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Mongo
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "medi360"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12

    # SMTP (reused by app.services.email_service for every outgoing attachment email)
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "reports@medi360.gr"
    smtp_from_name: str = "medi360"
    smtp_use_tls: bool = True

    # Weekly report automation
    reports_cron_secret: str = ""
    weekly_report_recipients: str = ""

    # Frontend origin for CORS
    frontend_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
