@echo off
setlocal EnableExtensions
REM APK instalavel (producao) - API: https://api-contas.srv-jvt.com
REM Perfil EAS: production-apk (buildType: apk)
REM Para Play Store (AAB): use "gerar aab playstore.bat"

set "EXPO_PUBLIC_API_URL=https://api-contas.srv-jvt.com"
set "EAS_BUILD_NO_EXPO_GO_WARNING=true"
set "CI=1"

echo.
echo ============================================================
echo  OrganizeContas - Build APK (producao)
echo ============================================================
echo  Perfil EAS : production-apk
echo  Saida      : arquivo .apk (instalacao direta)
echo  API        : %EXPO_PUBLIC_API_URL%
echo  Painel     : https://expo.dev/accounts/zevitor/projects/controle_contas/builds
echo ============================================================
echo.

echo [1/2] Validando projeto (expo-doctor)...
call npx expo-doctor
if errorlevel 1 (
  echo.
  echo AVISO: expo-doctor reportou problemas. O build pode continuar.
  echo.
)

echo [2/2] Iniciando EAS Build...
call npx eas-cli@latest build --platform android --profile production-apk --non-interactive
if errorlevel 1 goto erro

echo.
echo ============================================================
echo  Build enviado/concluido com sucesso.
echo  Baixe o APK no painel EAS (link acima) quando status = finished.
echo ============================================================
pause
exit /b 0

:erro
echo.
echo ============================================================
echo  ERRO no EAS Build
echo ============================================================
echo  1. Abra o painel: https://expo.dev/accounts/zevitor/projects/controle_contas/builds
echo  2. Clique no build mais recente e veja a fase que falhou (ex.: Run gradlew)
echo  3. Corrija o erro e execute este .bat novamente
echo.
call npx eas-cli@latest build:list --platform android --limit 3 --non-interactive 2>nul
pause
exit /b 1
