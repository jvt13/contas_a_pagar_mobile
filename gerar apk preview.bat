@echo off
setlocal EnableExtensions
REM APK preview (mesmo que build-android.bat, sem bump de versao)

set "EXPO_PUBLIC_API_URL=https://api-contas.srv-jvt.com"
set "EAS_BUILD_NO_EXPO_GO_WARNING=true"
set "CI=1"

echo.
echo === EAS Build: preview (APK) ===
echo API: %EXPO_PUBLIC_API_URL%
echo.

call npx eas-cli@latest build --platform android --profile preview --non-interactive
if errorlevel 1 goto erro

echo.
echo Build enviado. Painel: https://expo.dev/accounts/zevitor/projects/controle_contas/builds
pause
exit /b 0

:erro
echo ERRO no build EAS.
pause
exit /b 1
