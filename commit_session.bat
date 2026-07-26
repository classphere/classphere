@echo off
cd /d d:\classphere
git config user.email "harshsingh15dec@gmail.com"
git config user.name "harshsinghsv"
git add .
git commit -m "feat(mobile): native app feel, Android icons, institute build system, font sizing fixes"
git push
echo Done!
pause
