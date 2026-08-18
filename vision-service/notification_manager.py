"""
Notification Manager — native OS notification delivery using plyer.
Runs notification dispatch in a background thread to avoid blocking inference.
"""
import threading
import logging
import time

logger = logging.getLogger(__name__)

try:
    from plyer import notification as plyer_notification
    PLYER_AVAILABLE = True
except ImportError:
    PLYER_AVAILABLE = False
    logger.warning("plyer not available — native notifications disabled")


class NotificationManager:
    def __init__(self):
        self._browser_visible = True
        self._browser_focused = True
        self._last_native_notification = 0
        self._min_native_interval = 5  # seconds between native notifications

    def set_browser_state(self, visible: bool, focused: bool):
        """Update browser visibility/focus state from React client."""
        self._browser_visible = visible
        self._browser_focused = focused

    @property
    def should_use_native(self) -> bool:
        """Whether to use OS native notification instead of in-app."""
        return not self._browser_visible or not self._browser_focused

    def send_native_notification(self, title: str, message: str):
        """Send a native OS toast notification asynchronously."""
        if not PLYER_AVAILABLE:
            logger.warning("Native notification skipped (plyer not available)")
            return

        now = time.time()
        if now - self._last_native_notification < self._min_native_interval:
            return

        self._last_native_notification = now

        # Run in background thread to avoid blocking
        def _send():
            try:
                plyer_notification.notify(
                    title=title,
                    message=message,
                    app_name="PostureCoach",
                    timeout=8,
                )
                logger.info(f"Native notification sent: {title}")
            except Exception as e:
                logger.error(f"Native notification failed: {e}")
                # Never crash tracking due to notification failure

        thread = threading.Thread(target=_send, daemon=True)
        thread.start()
