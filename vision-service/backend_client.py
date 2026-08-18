"""
Backend Client — sends authenticated events to Express backend.
Uses httpx for async HTTP requests.
"""
import httpx
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)


class BackendClient:
    def __init__(self):
        self._event_url: str | None = None
        self._token: str | None = None
        self._client: httpx.AsyncClient | None = None

    def configure(self, event_url: str, token: str):
        """Configure the backend connection for a tracking session."""
        self._event_url = event_url
        self._token = token
        logger.info(f"Backend client configured: {event_url}")

    async def send_event(self, event_type: str, data: dict):
        """Send an event to the Express backend."""
        if not self._event_url or not self._token:
            logger.warning("Backend client not configured, skipping event")
            return

        payload = {"type": event_type, **data}
        headers = {"Authorization": f"Bearer {self._token}"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self._event_url, json=payload, headers=headers)
                if response.status_code != 200:
                    logger.error(f"Backend event failed ({response.status_code}): {response.text}")
                else:
                    logger.debug(f"Backend event sent: {event_type}")
        except Exception as e:
            logger.error(f"Backend event error: {e}")

    async def send_calibration(self, model_used: str):
        await self.send_event("calibration", {"modelUsed": model_used})

    async def send_state_change(self, previous_segment: dict, session_stats: dict):
        await self.send_event("state_change", {
            "previousSegment": previous_segment,
            "sessionStats": session_stats,
        })

    async def send_checkpoint(self, session_stats: dict):
        await self.send_event("checkpoint", {"sessionStats": session_stats})

    async def send_alert(self, alert_data: dict):
        await self.send_event("alert", alert_data)

    async def close(self):
        pass
