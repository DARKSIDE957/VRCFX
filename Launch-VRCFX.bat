@echo off
if exist "%~dp0release\win-unpacked\VRCFX.exe" (
  cd /d "%~dp0release\win-unpacked"
  start "" "%~dp0release\win-unpacked\VRCFX.exe"
) else (
  cd /d "%~dp0"
  npm run electron:dev
)
