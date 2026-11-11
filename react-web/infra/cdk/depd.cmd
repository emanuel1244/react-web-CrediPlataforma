@echo off
cd /d "%~dp0"
echo === tsc === > depd.log 2>&1
call npm run build >> depd.log 2>&1
echo === deploy === >> depd.log 2>&1
call npx cdk deploy Plataforma-dev --require-approval never >> depd.log 2>&1
echo DONE_EXIT=%ERRORLEVEL% >> depd.log
