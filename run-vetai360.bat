@echo off
title VetAI 360 — Smart Veterinary Healthcare Platform
echo ========================================================
echo        Starting VetAI 360 Full Platform...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking environment...
echo [2/3] Starting Backend, Frontend & ML Microservice...
echo [3/3] Opening browser at http://localhost:5173 ...

start "" http://localhost:5173
npm start
