@echo off
REM CenterMasr Server Launcher - Start Express server directly
REM This runs the Node.js server without Tauri (no build tools needed)

echo Starting CenterMasr Server...
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dist folder exists
if not exist "dist\index.html" (
    echo Building frontend...
    call npm run build
)

REM Install dependencies if needed
if not exist "node_modules\express" (
    echo Installing dependencies...
    call npm install
)

REM Start server
echo Server starting at: http://localhost:3001
echo Press Ctrl+C to stop.
echo.

node server/index.mjs

pause
