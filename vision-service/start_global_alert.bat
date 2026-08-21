@echo off
cd /d "%~dp0"

echo Starting Vision AI Global Posture Alert...
echo.

".venv\Scripts\python.exe" "global_alert_overlay.py"

pause
