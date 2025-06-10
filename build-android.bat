@echo off
REM — Define a URL de API
set "EXPO_PUBLIC_API_URL=https://www.srv-jvt.com"

REM — Incrementa o versionCode no app.json
echo 🚀 Bumping android versionCode...
call npm run bump-android-vercode
if errorlevel 1 goto erro

REM — Incrementa o expo.version (patch)
echo 🚀 Bumping expo version (patch)...
call npm run bump-expo-version
if errorlevel 1 goto erro

REM — Inicia o build remoto EAS
echo 🚀 Iniciando EAS build…
call npx eas build -p android --profile preview --clear-cache
if errorlevel 1 goto erro

echo ✅ Build iniciado! Confira o link no log acima.
pause
exit /b 0

:erro
echo ❌ Ocorreu um erro em um dos comandos acima.
pause
exit /b 1
