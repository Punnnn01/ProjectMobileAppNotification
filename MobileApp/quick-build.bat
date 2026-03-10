@echo off
echo ================================================
echo   Quick Build - 20 minutes (Like Before!)
echo ================================================
echo.

echo [STEP 1] Removing Firebase packages...
call npm uninstall @react-native-firebase/app @react-native-firebase/messaging

echo.
echo [STEP 2] Installing Expo packages...
call npx expo install expo-sharing expo-file-system

echo.
echo [STEP 3] Installing dependencies...
call npm install

echo.
echo [STEP 4] Building APK (Preview Profile)...
echo.
echo This will take about 20 minutes (no queue!)
echo.
call eas build --platform android --profile preview --non-interactive

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================
    echo   BUILD SUCCESS!
    echo ================================================
    echo.
    echo Download APK from:
    echo https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds
    echo.
) else (
    echo.
    echo ================================================
    echo   BUILD FAILED - Check logs
    echo ================================================
    echo.
)

pause
