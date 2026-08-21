from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import json
import queue
import socket
import threading
import time
import tkinter as tk
from typing import Any, Dict, List, Optional, Tuple


HOST = "127.0.0.1"
PORT = 8766


# ==============================================================
# IMPORTANT:
#
# Inspect the existing working FYP.
#
# Change ONLY this set if the actual authoritative confirmed
# bad-state string is different.
# ==============================================================

CONFIRMED_BAD_STATES = {
    "BAD_CONFIRMED",
}

GOOD_STATES = {
    "GOOD",
}

TEMPORARY_STATES = {
    "UNOBSERVED",
    "CALIBRATING",
}


SNOOZE_SECONDS = 60.0

# If telemetry stops completely, don't leave a stale warning
# permanently floating on Windows.
TELEMETRY_STALE_SECONDS = 3.0


# ==============================================================
# Win32 constants
# ==============================================================

GWL_EXSTYLE = -20

WS_EX_TOOLWINDOW = 0x00000080
WS_EX_NOACTIVATE = 0x08000000

GA_ROOT = 2

SWP_NOSIZE = 0x0001
SWP_NOMOVE = 0x0002
SWP_NOACTIVATE = 0x0010
SWP_SHOWWINDOW = 0x0040


class GlobalPostureAlert:
    """
    Presentation-only Windows overlay.

    This class DOES NOT:

    - calculate posture
    - calculate Bad Streak
    - calculate the original 60-second alert threshold
    - access camera
    - access MediaPipe
    - modify tracking
    - modify calibration
    - modify the database
    - modify React
    - communicate commands back into the FYP

    It only consumes a COPY of authoritative telemetry.
    """

    def __init__(self) -> None:

        # ==========================================================
        # Tk root
        # ==========================================================

        self.root = tk.Tk()

        # Start hidden.
        self.root.withdraw()

        # Notification-like window.
        self.root.overrideredirect(True)

        # Reliability first.
        self.root.configure(
            bg="#ffffff"
        )

        # No transparency tricks for submission reliability.
        self.root.attributes(
            "-alpha",
            1.0
        )

        self.width = 450
        self.height = 110
        self.margin = 22

        # ==========================================================
        # PRESENTATION STATE ONLY
        # ==========================================================

        self.alert_active = False

        self.snooze_until = 0.0

        self.latest_state = ""

        self.latest_bad_streak = 0.0

        self.latest_postures: List[str] = []

        self.latest_suggestion = ""

        self.visible = False

        self.last_render_signature: Optional[
            Tuple[Any, ...]
        ] = None

        self.last_telemetry_at = 0.0

        # Queue isolates UDP receiver thread from Tkinter.
        self.messages: "queue.Queue[Dict[str, Any]]" = (
            queue.Queue(maxsize=100)
        )

        # ==========================================================
        # UI
        # ==========================================================

        # Main white notification card
        self.container = tk.Frame(
            self.root,
            bg="#FFFFFF",
            highlightbackground="#D0D5DD",
            highlightthickness=1,
        )

        self.container.pack(
            fill="both",
            expand=True,
        )

        # ----------------------------------------------------------
        # Orange left accent matching previous React alert
        # ----------------------------------------------------------

        self.accent = tk.Frame(
            self.container,
            bg="#F59E0B",
            width=4,
        )

        self.accent.pack(
            side="left",
            fill="y",
        )

        self.accent.pack_propagate(False)

        # ----------------------------------------------------------
        # Main content
        # ----------------------------------------------------------

        self.content = tk.Frame(
            self.container,
            bg="#FFFFFF",
        )

        self.content.pack(
            side="left",
            fill="both",
            expand=True,
        )

        # ----------------------------------------------------------
        # Header row
        # ----------------------------------------------------------

        self.header = tk.Frame(
            self.content,
            bg="#FFFFFF",
        )

        self.header.pack(
            fill="x",
            padx=(12, 10),
            pady=(8, 0),
        )

        # ----------------------------------------------------------
        # Warning icon
        # ----------------------------------------------------------

        self.warning_canvas = tk.Canvas(
            self.header,
            width=24,
            height=24,
            bg="#FFFFFF",
            highlightthickness=0,
            bd=0,
        )

        self.warning_canvas.pack(
            side="left",
            padx=(0, 9),
        )

        # Yellow warning triangle
        self.warning_canvas.create_polygon(
            12, 2,
            22, 21,
            2, 21,
            fill="#FACC15",
            outline="#111827",
            width=2,
        )

        # Exclamation mark
        self.warning_canvas.create_text(
            12,
            14,
            text="!",
            fill="#111827",
            font=("Segoe UI", 9, "bold"),
        )

        # ----------------------------------------------------------
        # Header title
        # ----------------------------------------------------------

        self.title_label = tk.Label(
            self.header,
            text="Poor posture detected",
            bg="#FFFFFF",
            fg="#101828",
            font=("Segoe UI", 10, "bold"),
            anchor="w",
        )

        self.title_label.pack(
            side="left",
            fill="x",
            expand=True,
        )

        # ----------------------------------------------------------
        # X button
        # IMPORTANT:
        # KEEP EXISTING dismiss_alert callback
        # ----------------------------------------------------------

        self.close_button = tk.Button(
            self.header,
            text="×",
            command=self.dismiss_alert,
            bg="#FFFFFF",
            fg="#98A2B3",
            activebackground="#FFFFFF",
            activeforeground="#667085",
            bd=0,
            relief="flat",
            font=("Segoe UI", 12),
            cursor="hand2",
            padx=3,
            pady=0,
            takefocus=0,
        )

        self.close_button.pack(
            side="right",
        )

        # ----------------------------------------------------------
        # Text area underneath header
        # ----------------------------------------------------------

        self.text_area = tk.Frame(
            self.content,
            bg="#FFFFFF",
        )

        self.text_area.pack(
            fill="x",
            padx=(45, 12),
            pady=(1, 7),
        )

        # ----------------------------------------------------------
        # Current bad posture types
        # RED like existing React alert
        # ----------------------------------------------------------

        self.posture_label = tk.Label(
            self.text_area,
            text="",
            bg="#FFFFFF",
            fg="#F04438",
            font=("Segoe UI", 9, "bold"),
            anchor="w",
            justify="left",
        )

        self.posture_label.pack(
            fill="x",
            pady=(1, 2),
        )

        # ----------------------------------------------------------
        # Suggestion
        # ----------------------------------------------------------

        self.suggestion_label = tk.Label(
            self.text_area,
            text="",
            bg="#FFFFFF",
            fg="#667085",
            font=("Segoe UI", 9),
            anchor="w",
            justify="left",
            wraplength=380,
        )

        self.suggestion_label.pack(
            fill="x",
        )

        # Tkinter consumes queued telemetry on its own thread.
        self.root.after(
            50,
            self.process_messages,
        )

    # ==============================================================
    # SAFE HELPERS
    # ==============================================================

    @staticmethod
    def safe_float(
        value: Any,
        default: float = 0.0,
    ) -> float:

        try:
            return float(value)

        except (TypeError, ValueError):
            return default

    @staticmethod
    def normalize_postures(
        value: Any,
    ) -> List[str]:

        if isinstance(value, list):

            return [
                str(item)
                for item in value
                if item
            ]

        if isinstance(value, tuple):

            return [
                str(item)
                for item in value
                if item
            ]

        if isinstance(value, str):

            value = value.strip()

            if value:
                return [value]

        return []

    # ==============================================================
    # AUTHORITATIVE TELEMETRY INPUT
    # ==============================================================

    def handle_payload(
        self,
        data: Dict[str, Any],
    ) -> None:

        self.last_telemetry_at = time.monotonic()

        # ----------------------------------------------------------
        # Explicit Stop Tracking mirror
        # ----------------------------------------------------------

        if data.get("type") == "tracking_stopped":

            print(
                "[GLOBAL_ALERT] tracking stopped",
                flush=True,
            )

            self.reset_episode()

            return

        # ----------------------------------------------------------
        # READ EXISTING AUTHORITATIVE TELEMETRY
        # ----------------------------------------------------------
        #
        # IMPORTANT:
        #
        # Adapt ONLY these key accesses if the actual existing
        # telemetry field names differ.
        # ----------------------------------------------------------

        state = str(
            data.get(
                "state",
                "",
            )
        ).upper()

        bad_streak = self.safe_float(
            data.get(
                "badStreakSeconds",
                0.0,
            )
        )

        alert_triggered = bool(
            data.get(
                "alertTriggered",
                False,
            )
        )

        posture_types = self.normalize_postures(
            data.get(
                "postureTypes",
                [],
            )
        )

        suggestion = str(
            data.get("suggestion")
            or data.get("alertSuggestion")
            or ""
        )

        # Save current telemetry snapshot.

        self.latest_state = state

        self.latest_bad_streak = bad_streak

        self.latest_postures = posture_types

        self.latest_suggestion = suggestion

        # ----------------------------------------------------------
        # GOOD = END OF BAD EPISODE
        # ----------------------------------------------------------

        if state in GOOD_STATES:

            self.reset_episode()

            return

        # ----------------------------------------------------------
        # CONFIRMED BAD
        # ----------------------------------------------------------

        if state in CONFIRMED_BAD_STATES:

            # ------------------------------------------------------
            # CRITICAL:
            #
            # alertTriggered can be a MOMENTARY event.
            #
            # Do NOT require it on every frame.
            #
            # Activate from either:
            #
            # 1. actual existing alert event
            #
            # OR
            #
            # 2. existing authoritative Bad Streak already >= 60
            #
            # Condition 2 is NOT another timer.
            #
            # It uses the FYP's already-calculated Bad Streak and
            # provides recovery if:
            #
            # - UDP missed the exact alertTriggered packet
            # - sidecar was started after 60 sec
            # ------------------------------------------------------

            if (
                alert_triggered
                or bad_streak >= 60.0
            ):

                self.alert_active = True

            # IMPORTANT:
            #
            # alertTriggered becoming false later MUST NOT reset
            # alert_active.

            self.evaluate_visibility()

            return

        # ----------------------------------------------------------
        # TEMPORARY STATES
        # ----------------------------------------------------------

        if state in TEMPORARY_STATES:

            # Temporarily hide because we don't currently have a
            # confirmed bad pose to warn about.

            self.hide()

            # Only destroy the latched episode if the authoritative
            # Bad Streak itself really reset.

            if bad_streak <= 0.0:

                self.alert_active = False
                self.snooze_until = 0.0

            return

        # ----------------------------------------------------------
        # OTHER STATES
        # ----------------------------------------------------------

        # If the authoritative streak is genuinely reset,
        # clear the presentation episode.

        if bad_streak <= 0.0:

            self.reset_episode()

        else:

            self.evaluate_visibility()

    # ==============================================================
    # PRESENTATION STATE
    # ==============================================================

    def evaluate_visibility(self) -> None:

        # ----------------------------------------------------------
        # No active episode
        # ----------------------------------------------------------

        if not self.alert_active:

            self.hide()

            return

        # ----------------------------------------------------------
        # We only visually warn during authoritative confirmed BAD
        # ----------------------------------------------------------

        if (
            self.latest_state
            not in CONFIRMED_BAD_STATES
        ):

            self.hide()

            return

        now = time.monotonic()

        # ----------------------------------------------------------
        # Prevent stale floating alert if telemetry disappears
        # ----------------------------------------------------------

        if (
            self.last_telemetry_at > 0
            and
            now - self.last_telemetry_at
            > TELEMETRY_STALE_SECONDS
        ):

            self.hide()

            return

        # ----------------------------------------------------------
        # Native X snooze
        # ----------------------------------------------------------

        if self.snooze_until > 0.0:

            if now < self.snooze_until:

                self.hide()

                return

            # Exactly 60 seconds passed since X.

            self.snooze_until = 0.0

        self.show_or_update()

    # ==============================================================
    # X
    # ==============================================================

    def dismiss_alert(self) -> None:

        if not self.alert_active:

            self.hide()

            return

        # ----------------------------------------------------------
        # IMPORTANT:
        #
        # X is presentation-only.
        #
        # DO NOT reset:
        #
        # - alert_active
        # - Bad Streak
        # - posture episode
        # - tracking
        # - Monitoring
        # ----------------------------------------------------------

        self.snooze_until = (
            time.monotonic()
            + SNOOZE_SECONDS
        )

        print(
            "[GLOBAL_ALERT] dismissed; "
            "60-second presentation snooze started",
            flush=True,
        )

        self.hide()

    # ==============================================================
    # RESET
    # ==============================================================

    def reset_episode(self) -> None:

        self.alert_active = False

        self.snooze_until = 0.0

        self.latest_state = ""

        self.latest_bad_streak = 0.0

        self.latest_postures = []

        self.latest_suggestion = ""

        self.hide()

    # ==============================================================
    # DURATION
    # ==============================================================

    @staticmethod
    def format_duration(
        seconds: float,
    ) -> str:

        total = max(
            0,
            int(seconds),
        )

        minutes, secs = divmod(
            total,
            60,
        )

        if minutes > 0:

            return (
                f"{minutes}m "
                f"{secs:02d}s"
            )

        return f"{secs}s"

    # ==============================================================
    # SHOW / UPDATE WINDOW
    # ==============================================================

    def show_or_update(self) -> None:

        displayed_second = int(
            max(
                0,
                self.latest_bad_streak,
            )
        )

        signature = (
            displayed_second,
            tuple(self.latest_postures),
            self.latest_suggestion,
        )

        # ----------------------------------------------------------
        # Avoid 20/30 FPS UI redraws.
        #
        # Update when:
        #
        # - visible second changes
        # - posture list changes
        # - suggestion changes
        # ----------------------------------------------------------

        if (
            self.visible
            and
            signature
            == self.last_render_signature
        ):

            return

        self.last_render_signature = signature

        duration = self.format_duration(
            self.latest_bad_streak
        )

        self.title_label.configure(
            text=(
                "Poor posture detected · "
                f"{duration}"
            )
        )

        posture_text = " · ".join(
            self.latest_postures
        )

        if not posture_text:

            posture_text = "Poor posture"

        self.posture_label.configure(
            text=posture_text
        )

        self.suggestion_label.configure(
            text=self.latest_suggestion
        )

        # ----------------------------------------------------------
        # Position top-right of Windows screen
        # ----------------------------------------------------------

        screen_width = (
            self.root.winfo_screenwidth()
        )

        x = max(
            0,
            screen_width
            - self.width
            - self.margin,
        )

        y = self.margin+55

        self.root.geometry(
            f"{self.width}x{self.height}"
            f"+{x}+{y}"
        )

        # ----------------------------------------------------------
        # CRITICAL TKINTER ORDER
        # ----------------------------------------------------------

        self.root.deiconify()

        self.root.update_idletasks()

        # Tk topmost provides a simple fallback.
        try:

            self.root.attributes(
                "-topmost",
                True,
            )

        except Exception:

            pass

        self.apply_rounded_corners()

        # Apply Windows-specific no-activate behavior.
        self.apply_windows_styles()

        self.visible = True

    # ==============================================================
    # HIDE
    # ==============================================================

    def hide(self) -> None:

        if not self.visible:

            # If Tk already withdrawn, no need to keep issuing
            # withdraw commands.
            try:

                if self.root.state() == "withdrawn":

                    return

            except tk.TclError:

                return

        try:

            self.root.withdraw()

        except tk.TclError:

            pass

        self.visible = False

        self.last_render_signature = None

    # ==============================================================
    # WINDOWS HWND
    # ==============================================================

    def get_top_level_hwnd(
        self,
    ) -> Optional[int]:

        if not hasattr(
            ctypes,
            "windll",
        ):

            return None

        try:

            user32 = (
                ctypes.windll.user32
            )

            # Try Tk's actual WM frame first.

            try:

                frame_value = (
                    self.root.wm_frame()
                )

                if isinstance(
                    frame_value,
                    str,
                ):

                    frame_value = (
                        frame_value.strip()
                    )

                    if frame_value.lower().startswith(
                        "0x"
                    ):

                        base_hwnd = int(
                            frame_value,
                            16,
                        )

                    else:

                        base_hwnd = int(
                            frame_value
                        )

                else:

                    base_hwnd = int(
                        frame_value
                    )

            except Exception:

                base_hwnd = int(
                    self.root.winfo_id()
                )

            root_hwnd = (
                user32.GetAncestor(
                    base_hwnd,
                    GA_ROOT,
                )
            )

            if root_hwnd:

                return int(
                    root_hwnd
                )

            return int(
                base_hwnd
            )

        except Exception:

            return None

    def apply_rounded_corners(self) -> None:
        if not hasattr(ctypes, "windll"):
            return

        try:
            hwnd = self.get_top_level_hwnd()

            if not hwnd:
                return

            gdi32 = ctypes.windll.gdi32
            user32 = ctypes.windll.user32

            region = gdi32.CreateRoundRectRgn(
                0,
                0,
                self.width + 1,
                self.height + 1,
                12,
                12,
            )

            if region:
                result = user32.SetWindowRgn(
                    hwnd,
                    region,
                    True,
                )

                # IMPORTANT:
                # After successful SetWindowRgn,
                # Windows owns the HRGN.
                #
                # Do NOT DeleteObject(region) after success.

                if result == 0:
                    gdi32.DeleteObject(region)

        except Exception as exc:
            print(
                f"[GLOBAL_ALERT] rounded corner warning: {exc}",
                flush=True,
            )

    # ==============================================================
    # WINDOWS TOPMOST + NO ACTIVATE
    # ==============================================================

    def apply_windows_styles(
        self,
    ) -> None:

        if not hasattr(
            ctypes,
            "windll",
        ):

            return

        try:

            user32 = (
                ctypes.windll.user32
            )

            hwnd = (
                self.get_top_level_hwnd()
            )

            if not hwnd:

                return

            # Win32 function signatures.

            user32.GetWindowLongW.argtypes = [
                wintypes.HWND,
                ctypes.c_int,
            ]

            user32.GetWindowLongW.restype = (
                ctypes.c_long
            )

            user32.SetWindowLongW.argtypes = [
                wintypes.HWND,
                ctypes.c_int,
                ctypes.c_long,
            ]

            user32.SetWindowLongW.restype = (
                ctypes.c_long
            )

            user32.SetWindowPos.argtypes = [
                wintypes.HWND,
                wintypes.HWND,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_uint,
            ]

            user32.SetWindowPos.restype = (
                wintypes.BOOL
            )

            current_exstyle = (
                user32.GetWindowLongW(
                    hwnd,
                    GWL_EXSTYLE,
                )
            )

            desired_exstyle = (
                current_exstyle
                | WS_EX_TOOLWINDOW
                | WS_EX_NOACTIVATE
            )

            if (
                desired_exstyle
                != current_exstyle
            ):

                user32.SetWindowLongW(
                    hwnd,
                    GWL_EXSTYLE,
                    desired_exstyle,
                )

            # IMPORTANT:
            #
            # TOPMOST is a Z-order state.
            #
            # It is NOT something we OR into GWL_EXSTYLE.

            HWND_TOPMOST = (
                wintypes.HWND(-1)
            )

            user32.SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE
                | SWP_NOSIZE
                | SWP_NOACTIVATE
                | SWP_SHOWWINDOW,
            )

        except Exception as exc:

            print(
                "[GLOBAL_ALERT] "
                f"Win32 styling warning: "
                f"{exc}",
                flush=True,
            )

            # Fallback:
            #
            # Never crash the sidecar simply because Win32 styling
            # could not be applied.

            try:

                self.root.attributes(
                    "-topmost",
                    True,
                )

            except Exception:

                pass

    # ==============================================================
    # TK MESSAGE LOOP
    # ==============================================================

    def process_messages(self) -> None:

        try:

            while True:

                data = (
                    self.messages.get_nowait()
                )

                self.handle_payload(
                    data
                )

        except queue.Empty:

            pass

        # ----------------------------------------------------------
        # Evaluate snooze expiry even between packets.
        # ----------------------------------------------------------

        if self.alert_active:

            self.evaluate_visibility()

        self.root.after(
            50,
            self.process_messages,
        )

    # ==============================================================
    # UDP RECEIVER THREAD
    # ==============================================================

    def start_receiver(self) -> None:

        receiver = threading.Thread(
            target=self.udp_receiver,
            name="GlobalAlertUDP",
            daemon=True,
        )

        receiver.start()

    def udp_receiver(self) -> None:

        sock = socket.socket(
            socket.AF_INET,
            socket.SOCK_DGRAM,
        )

        sock.setsockopt(
            socket.SOL_SOCKET,
            socket.SO_REUSEADDR,
            1,
        )

        sock.bind(
            (
                HOST,
                PORT,
            )
        )

        print(
            "[GLOBAL_ALERT] listening on "
            f"udp://{HOST}:{PORT}",
            flush=True,
        )

        last_log_time = 0.0

        while True:

            try:

                raw, _address = (
                    sock.recvfrom(
                        65535
                    )
                )

                data = json.loads(
                    raw.decode(
                        "utf-8"
                    )
                )

                # --------------------------------------------------
                # Non-blocking handoff to Tk thread
                # --------------------------------------------------

                try:

                    self.messages.put_nowait(
                        data
                    )

                except queue.Full:

                    # Keep newest telemetry.

                    try:

                        self.messages.get_nowait()

                    except queue.Empty:

                        pass

                    try:

                        self.messages.put_nowait(
                            data
                        )

                    except queue.Full:

                        pass

                # --------------------------------------------------
                # Diagnostic log maximum approximately once/sec
                # --------------------------------------------------

                now = time.monotonic()

                if (
                    now
                    - last_log_time
                    >= 1.0
                ):

                    last_log_time = now

                    if (
                        data.get("type")
                        == "tracking_stopped"
                    ):

                        print(
                            "[GLOBAL_RX] "
                            "tracking_stopped",
                            flush=True,
                        )

                    else:

                        state = data.get(
                            "state"
                        )

                        streak = self.safe_float(
                            data.get(
                                "badStreakSeconds",
                                0,
                            )
                        )

                        triggered = data.get(
                            "alertTriggered"
                        )

                        postures = data.get(
                            "postureTypes"
                        )

                        print(
                            "[GLOBAL_RX] "
                            f"state={state} "
                            f"badStreak="
                            f"{streak:.1f} "
                            f"alertTriggered="
                            f"{triggered} "
                            f"postures="
                            f"{postures}",
                            flush=True,
                        )

            except Exception as exc:

                print(
                    "[GLOBAL_ALERT] "
                    f"UDP receive error: "
                    f"{exc}",
                    flush=True,
                )

                time.sleep(
                    0.1
                )

    # ==============================================================
    # RUN
    # ==============================================================

    def run(self) -> None:

        self.start_receiver()

        self.root.mainloop()


# ================================================================
# VISUAL TEST MODE
# ================================================================

def run_visual_test() -> None:

    alert = GlobalPostureAlert()

    alert.alert_active = True

    alert.latest_state = next(
        iter(
            CONFIRMED_BAD_STATES
        )
    )

    alert.latest_bad_streak = 75.0

    alert.latest_postures = [
        "Forward Head",
        "Slouching",
        "Shoulder Tilt",
    ]

    alert.latest_suggestion = (
        "Move your head back."
    )

    # Ensure the stale-telemetry guard doesn't hide test mode.

    alert.last_telemetry_at = (
        time.monotonic()
    )

    alert.show_or_update()

    print(
        "",
        flush=True,
    )

    print(
        "========================================",
        flush=True,
    )

    print(
        "[GLOBAL_ALERT] TEST MODE RUNNING",
        flush=True,
    )

    print(
        "USER VISUAL CHECK REQUIRED",
        flush=True,
    )

    print(
        "A global posture alert should be "
        "visible at the TOP-RIGHT of Windows.",
        flush=True,
    )

    print(
        "Do NOT claim visual PASS automatically.",
        flush=True,
    )

    print(
        "========================================",
        flush=True,
    )

    alert.root.mainloop()


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--test",
        action="store_true",
        help=(
            "Display a hard-coded native "
            "Windows alert for visual verification."
        ),
    )

    args = parser.parse_args()

    if args.test:

        run_visual_test()

    else:

        GlobalPostureAlert().run()
