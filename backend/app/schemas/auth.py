import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def clean_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254 or not EMAIL.fullmatch(value):
        raise ValueError("Enter a valid email address.")
    return value


class SignupIn(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    business_name: str = Field(default="", max_length=120)
    country: str = Field(min_length=2, max_length=80)

    _email = field_validator("email")(clean_email)

    @field_validator("name", "business_name", "country")
    @classmethod
    def strip(cls, value: str) -> str:
        return " ".join(value.split())


class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    _email = field_validator("email")(clean_email)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    business_name: str
    country: str
