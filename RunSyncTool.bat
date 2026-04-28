@echo off
setlocal
title Option Sync Launcher

cd /d "%~dp0"

echo ============================================
echo  Option Sync - Minecraft Bedrock Manager
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found.
    echo Please install Node.js LTS from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0package.json" (
    echo ERROR: package.json was not found.
    echo Run this file from the Option-Sync project folder.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0node_modules" (
    echo Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

echo Starting Option Sync...
echo The app opens in your browser. Keep this window open.
echo.
call npm start

echo.
echo Option Sync has stopped.
pause
