"""
Recommendation Engine — centralized ergonomic recommendations mapped to posture types.
"""

RECOMMENDATIONS: dict[str, str] = {
    "Forward Head": "Move your head back.",
    "Too Close": "Move slightly away from the screen.",
    "Too Far": "Come a little closer.",
    "Face Tilt": "Keep your face straight.",
    "Head Tilt": "Keep your face straight.",
    "Slouching": "Straighten your back.",
    "Leaning Left": "Sit straight and move slightly right.",
    "Leaning Right": "Sit straight and move slightly left.",
    "Leaning Back": "Bring your torso toward a neutral upright position.",
    "Shoulder Tilt": "Level your shoulders.",
    "Chin Too High": "Lower your chin slightly.",
    "Chin Too Low": "Raise your chin slightly.",
}


def get_recommendation(posture_types: list[str]) -> str:
    """Get the primary recommendation for the given posture types."""
    for pt in posture_types:
        if pt in RECOMMENDATIONS:
            return RECOMMENDATIONS[pt]
    return ""


def get_alert_message(posture_types: list[str], bad_duration: float) -> str:
    """Generate alert message for notification."""
    types_str = " + ".join(posture_types) if posture_types else "Bad Posture"
    mins = int(bad_duration // 60)
    secs = int(bad_duration % 60)
    duration_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"
    return f"{types_str} detected for {duration_str}"
