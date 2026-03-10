@echo off
echo ================================================
echo   Fixing Build Issues - Step by Step
echo ================================================
echo.

echo [STEP 1] Removing React Native Firebase (not compatible with Expo 52)
echo.
call npm uninstall @react-native-firebase/app @react-native-firebase/messaging

echo.
echo [STEP 2] Installing missing dependencies...
echo.
call npx expo install expo-file-system

echo.
echo [STEP 3] Installing all dependencies...
echo.
call npm install

echo.
echo [STEP 4] Cleaning build cache...
echo.
call npx expo prebuild --clean

echo.
echo [STEP 5] Building Android APK (Preview mode)...
echo.
echo This will take 5-10 minutes...
echo You can check progress at: https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds
echo.
call eas build --platform android --profile preview --clear-cache

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================
    echo   BUILD SUCCESS!
    echo ================================================
    echo.
    echo Download your APK from the EAS dashboard!
    echo.
) else (
    echo.
    echo ================================================
    echo   BUILD FAILED
    echo ================================================
    echo.
    echo Please check the error logs above.
    echo Or visit: https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds
    echo.
)

pause
