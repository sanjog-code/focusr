@echo off
setlocal
title Launching Focusr (Standalone Window)

set "FILE_URI=file:///%~dp0index.html"

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%FILE_URI%" --start-fullscreen
    exit /b 0
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="%FILE_URI%" --start-fullscreen
    exit /b 0
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%FILE_URI%" --start-fullscreen
    exit /b 0
)

if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="%FILE_URI%" --start-fullscreen
    exit /b 0
)

start "" "%FILE_URI%"
exit /b 0
