@echo off
echo ================================================
echo   Complete Fix for EAS Build Issues
echo ================================================
echo.

echo [STEP 1] Removing problematic packages...
echo.
call npm uninstall @react-native-firebase/app @react-native-firebase/messaging expo-sharing

if %ERRORLEVEL% neq 0 (
    echo [WARNING] Some packages might already be removed
)

echo.
echo [STEP 2] Reinstalling expo-sharing with correct version...
echo.
call npx expo install expo-sharing

echo.
echo [STEP 3] Making sure expo-file-system is installed...
echo.
call npx expo install expo-file-system

echo.
echo [STEP 4] Installing all dependencies...
echo.
call npm install

echo.
echo [STEP 5] Cleaning everything...
echo.
if exist android (
    rmdir /s /q android
    echo Deleted android folder
)
if exist ios (
    rmdir /s /q ios
    echo Deleted ios folder
)

echo.
echo [STEP 6] Running prebuild...
echo.
call npx expo prebuild --clean

echo.
echo [STEP 7] Building Android APK...
echo.
echo This will take 10-15 minutes...
echo You can check progress at:
echo https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds
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
    echo Please check the logs at:
    echo https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds
    echo.
)

pause
