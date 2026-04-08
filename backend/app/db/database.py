from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.settings import settings


class Base(DeclarativeBase):
    pass


def _db_url() -> str:
    # Local SQLite for demo; swap with Postgres/PostGIS later.
    return settings.db_url


engine = create_engine(_db_url(), connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    from app.models.entities import (  # noqa
        LandHealthEntity,
        OrthomosaicUploadEntity,
        ParcelEntity,
        RasterUploadEntity,
        ValuationEntity,
    )

    Base.metadata.create_all(bind=engine)

