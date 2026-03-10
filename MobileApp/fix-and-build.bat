@echo off
echo ================================================
echo   Fix and Build Android App
echo ================================================
echo.

echo [STEP 1] Installing missing dependencies...
echo.
call npx expo install expo-file-system

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [STEP 2] Installing all dependencies...
echo.
call npm install

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install npm packages
    pause
    exit /b 1
)

echo.
echo [STEP 3] Cleaning build cache...
echo.
call npx expo prebuild --clean

echo.
echo [STEP 4] Building Android APK (Preview mode)...
echo.
echo This will take 5-10 minutes...
echo.
call eas build --platform android --profile preview --clear-cache

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================
    echo   BUILD SUCCESS!
    echo ================================================
    echo.
    echo Check your EAS dashboard for the APK download link.
    echo.
) else (
    echo.
    echo ================================================
    echo   BUILD FAILED
    echo ================================================
    echo.
    echo Please check the error logs above.
    echo.
)

pause
