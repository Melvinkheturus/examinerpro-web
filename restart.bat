@echo off
echo Stopping any running React development servers...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Clearing cache...
if exist "node_modules\.cache" (
  rd /s /q "node_modules\.cache"
)

echo Starting the development server...
npm start 