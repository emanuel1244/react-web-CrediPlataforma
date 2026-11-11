@echo off
cd /d "%~dp0"
call npm run build > wb2.log 2>&1
echo DONE_EXIT=%ERRORLEVEL% >> wb2.log
