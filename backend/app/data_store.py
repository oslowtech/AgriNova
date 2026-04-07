from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


@dataclass
class CacheItem:
    expires_at: datetime
    value: Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 300) -> None:
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, CacheItem] = {}

    def get(self, key: str) -> Any | None:
        item = self._store.get(key)
        if item is None:
            return None
        now = datetime.now(timezone.utc)
        if now > item.expires_at:
            del self._store[key]
            return None
        return item.value

    def set(self, key: str, value: Any) -> None:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.ttl_seconds)
        self._store[key] = CacheItem(expires_at=expires_at, value=value)
