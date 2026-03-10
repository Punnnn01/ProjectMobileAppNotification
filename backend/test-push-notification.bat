@echo off
echo ================================================
echo   Test Push Notification
echo ================================================
echo.

set /p TITLE="Enter notification title: "
set /p BODY="Enter notification body: "

echo.
echo Sending notification...
echo Title: %TITLE%
echo Body: %BODY%
echo.

curl -X POST http://localhost:3000/api/notifications/send ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"%TITLE%\",\"body\":\"%BODY%\",\"targetGroup\":\"all\"}"

echo.
echo.
echo ================================================
echo   Done!
echo ================================================
echo.
pause
