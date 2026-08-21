import json
import socket
from typing import Any, Dict


HOST = "127.0.0.1"
PORT = 8766


# Fire-and-forget UDP publisher.
#
# This socket NEVER receives anything.
# The global alert is not allowed to control the FYP.
_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
_sock.setblocking(False)


def publish(payload: Dict[str, Any]) -> None:
    """
    Send a COPY of already-calculated telemetry to the optional
    Windows global-alert sidecar.

    CRITICAL SAFETY GUARANTEES:

    - Never wait for a response.
    - Never retry.
    - Never receive.
    - Never block tracking.
    - Never raise an exception into the caller.
    - Sidecar may be completely offline.
    """

    try:
        raw = json.dumps(
            payload,
            separators=(",", ":"),
        ).encode("utf-8")

        _sock.sendto(
            raw,
            (HOST, PORT),
        )

    except Exception:
        # The native alert is optional presentation only.
        # It must NEVER affect the FYP.
        return
