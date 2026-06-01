@echo off
setlocal EnableExtensions
REM AAB para Google Play Store - API: https://api-contas.srv-jvt.com
REM Perfil EAS: production (buildType: app-bundle)

set "EXPO_PUBLIC_API_URL=https://api-contas.srv-jvt.com"
set "EAS_BUILD_NO_EXPO_GO_WARNING=true"
set "CI=1"

echo.
echo ============================================================
echo  OrganizeContas - Build AAB (Play Store)
echo ============================================================
echo  Perfil EAS : production
echo  Saida      : arquivo .aab
echo  API        : %EXPO_PUBLIC_API_URL%
echo ============================================================
echo.

call npx eas-cli@latest build --platform android --profile production --non-interactive
if errorlevel 1 goto erro

echo.
echo Build concluido/enviado. Baixe o AAB no painel EAS.
pause
exit /b 0

:erro
echo ERRO no build. Veja: https://expo.dev/accounts/zevitor/projects/controle_contas/builds
pause
exit /b 1
