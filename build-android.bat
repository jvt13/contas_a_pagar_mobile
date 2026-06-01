@echo off
setlocal EnableExtensions
REM APK preview + bump versionCode — API producao
set "EXPO_PUBLIC_API_URL=https://api-contas.srv-jvt.com"
set "EAS_BUILD_NO_EXPO_GO_WARNING=true"
set "CI=1"

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
call npx eas-cli@latest build -p android --profile preview --clear-cache --non-interactive
if errorlevel 1 goto erro

echo ✅ Build iniciado! Confira o link no log acima.
pause
exit /b 0

:erro
echo ❌ Ocorreu um erro em um dos comandos acima.
pause
exit /b 1
