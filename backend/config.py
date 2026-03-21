import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "stables_db")
DB_USER = os.getenv("DB_USER", "db_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "db_pass")
DB_PORT = os.getenv("DB_PORT", 5432)
DB_DIALECT = os.getenv("DB_DIALECT", "postgresql").lower()
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./data/stables.db")
DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY.strip() == "":
    raise ValueError("SECRET_KEY environment variable is not set")
# type-checker knows SECRET_KEY is str beyond this point
SECRET_KEY: str = SECRET_KEY

ACCESS_EXPIRES_MINUTES = int(os.getenv("ACCESS_EXPIRES_MINUTES", "15"))
REFRESH_EXPIRES_DAYS = int(os.getenv("REFRESH_EXPIRES_DAYS", "30"))

ACCESS_EXPIRES = timedelta(minutes=ACCESS_EXPIRES_MINUTES)
REFRESH_EXPIRES = timedelta(days=REFRESH_EXPIRES_DAYS)

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_COOKIE_NAME = os.getenv("JWT_ACCESS_COOKIE_NAME", "access_token")
JWT_REFRESH_COOKIE_NAME = os.getenv("JWT_REFRESH_COOKIE_NAME", "refresh_token")
JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
