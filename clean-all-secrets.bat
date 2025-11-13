@echo off
REM Script to clean ALL sensitive files from Git history

echo ========================================
echo Cleaning ALL Secret Files from Git History
echo ========================================
echo.

echo [1/4] Removing ALL sensitive files from all commits...
git filter-branch --force --index-filter ^
  "git rm --cached --ignore-unmatch backend/serviceAccountKey.json backend/appnoti-fa1cc-firebase-adminsdk-fbsvc-91155d82ee.json backend/*.json" ^
  --prune-empty --tag-name-filter cat -- --all

echo.
echo [2/4] Cleaning up references...
git for-each-ref --format="delete %%(refname)" refs/original | git update-ref --stdin

echo.
echo [3/4] Garbage collection...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo.
echo [4/4] Force pushing to GitHub...
git push origin main --force

echo.
echo ========================================
echo Done! Check if push was successful.
echo ========================================
pause
