@echo off
setlocal EnableExtensions

if "%~1"=="" (
  echo Usage: cloud-run-verify.cmd "https://REPLACE_WITH_GATEWAY_URL"
  exit /b 2
)

where curl.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: curl.exe was not found on this Windows computer.
  exit /b 3
)

set "GATEWAY_URL=%~1"
if "%GATEWAY_URL:~-1%"=="/" set "GATEWAY_URL=%GATEWAY_URL:~0,-1%"

echo Checking GET %GATEWAY_URL%/healthz
curl.exe --silent --show-error --fail-with-body "%GATEWAY_URL%/healthz"
set "VERIFY_EXIT_CODE=%ERRORLEVEL%"
echo.

if not "%VERIFY_EXIT_CODE%"=="0" (
  echo ERROR: Gateway health verification failed with exit code %VERIFY_EXIT_CODE%.
  exit /b %VERIFY_EXIT_CODE%
)

echo Gateway health verification completed successfully.
exit /b 0
