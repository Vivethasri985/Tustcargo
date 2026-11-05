from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"
    database_url: str = "sqlite:///./trustcargo.db"
    upload_dir: str = "uploads"
    max_upload_mb: int = 5

    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"


settings = Settings()
