@echo off
title AI-Based Personal Posture Coach - Starting All Services
echo ========================================
echo  AI-Based Personal Posture Coach
echo  Starting All Services...
echo ========================================
echo.

:: Start MongoDB (assumes it's running as a service or start manually)
echo [1/3] Checking MongoDB...
echo Make sure MongoDB is running on localhost:27017
echo.

:: Start Express Backend
echo [2/3] Starting Express Backend...
start "Express Backend" cmd /k "cd /d %~dp0server && npm start"
timeout /t 3 /nobreak > nul

:: Start React Frontend
echo [3/3] Starting React Frontend...
start "React Frontend" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo  Services Starting:
echo  - Express Backend: http://localhost:5000
echo  - React Frontend:  http://localhost:5173
echo ========================================
echo.
echo To start the Vision Service (required for posture tracking):
echo   cd vision-service
echo   python -m venv venv
echo   venv\Scripts\activate
echo   pip install -r requirements.txt
echo   python main.py
echo.
echo Vision Service will run on: http://localhost:8000
echo.
pause
