import json
import redis as _redis
from app.config import REDIS_URL


class RedisProgressPublisher:
    """Publishes processing progress events to a Redis pub/sub channel."""

    def __init__(self, book_id: str):
        self._channel = f"book:{book_id}:progress"
        self._client = _redis.from_url(REDIS_URL)

    def publish(self, data: dict) -> None:
        self._client.publish(self._channel, json.dumps(data))

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
