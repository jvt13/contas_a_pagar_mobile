@echo off
REM APK de teste com API local (mesma rede Wi-Fi do PC)
set "EXPO_PUBLIC_API_URL=http://192.168.15.100:3100"

echo.
echo === OrganizeContas - APK de teste (debug) ===
echo API: %EXPO_PUBLIC_API_URL%
echo.

echo [1/3] Prebuild Android...
call npx expo prebuild --platform android --non-interactive
if errorlevel 1 goto erro

echo [2/3] Gradle assembleDebug...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 goto erro
cd ..

echo.
echo === APK gerado ===
echo %CD%\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Instale no celular (USB ou envie o arquivo) e use a mesma rede do backend.
pause
exit /b 0

:erro
echo.
echo ERRO no build. Verifique Java, Android SDK e ANDROID_HOME.
pause
exit /b 1
