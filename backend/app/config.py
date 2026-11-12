from typing import Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"
    database_url: str = "sqlite:///./trustcargo.db"
    upload_dir: str = "uploads"
    max_upload_mb: int = 5
    storage_backend: Literal["local", "supabase"] = "local"
    supabase_url: str = ""
    supabase_secret_key: SecretStr = SecretStr("")
    supabase_storage_bucket: str = "trustcargo-evidence"

    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""

    session_days: int = 14
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    email_from: str = ""

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-120b"
    groq_vision_model: str = "qwen/qwen3.8-27b"

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        """Accept the postgres:// URLs that hosts such as Render provide."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    def validate_deployment(self) -> None:
        """Fail before initialization rather than lose data on an ephemeral disk."""
        if self.storage_backend == "supabase":
            if not self.supabase_url.startswith("https://") or not self.supabase_secret_key.get_secret_value():
                raise ValueError("Supabase storage requires an HTTPS SUPABASE_URL and SUPABASE_SECRET_KEY.")
            if not self.supabase_storage_bucket or "/" in self.supabase_storage_bucket:
                raise ValueError("Set a valid SUPABASE_STORAGE_BUCKET.")
        if self.app_env != "production":
            return
        url = make_url(self.database_url)
        if url.get_backend_name() != "postgresql":
            raise ValueError("Production requires a PostgreSQL DATABASE_URL; SQLite data is left untouched.")
        if url.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
            raise ValueError("Production DATABASE_URL must require TLS with sslmode=require or verify-full.")
        if self.storage_backend != "supabase":
            raise ValueError("Production requires STORAGE_BACKEND=supabase.")
        if not self.frontend_url.startswith("https://"):
            raise ValueError("Production FRONTEND_URL must use HTTPS.")

    @property
    def secure_cookies(self) -> bool:
        return self.app_env == "production" or self.frontend_url.startswith("https://")

    @property
    def email_enabled(self) -> bool:
        return bool(self.smtp_host and self.email_from)

    @field_validator("frontend_url")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")


settings = Settings()
