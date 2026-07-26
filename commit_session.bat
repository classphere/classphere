@echo off
cd /d d:\classphere
echo Setting git author to harshsingh15dec@gmail.com...
git config user.email "harshsingh15dec@gmail.com"
git config user.name "harshsingh15dec"

echo.
echo Committing legacy webhook removals and any remaining modified files...
git add apps/api/src/modules/webhooks/datalab.controller.ts apps/api/src/modules/webhooks/datalab.routes.ts
git commit -a -m "fix(api): remove legacy datalab webhook imports and commit remaining cleanups for docker build"

echo.
echo Pushing build fix to remote repository...
git push

echo.
echo Done! Build fix committed and pushed.
pause
