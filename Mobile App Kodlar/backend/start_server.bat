@echo off
title İSKİ Saha Tekniker Backend Server
color 0A

echo ==================================================
echo İSKİ Saha Tekniker Backend Server Başlatılıyor...
echo ==================================================
echo.

:: Node.js kontrolü
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js kurulu değil!
    echo Lutfen https://nodejs.org/ adresinden Node.js LTS surumunu indirin ve kurun.
    echo.
    pause
    exit /b 1
)

:: Bağımlılıkları kontrol et ve yükle
if not exist "node_modules" (
    echo [INFO] Node modules bulunamadi, yukleniyor...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] NPM install basarisiz!
        pause
        exit /b 1
    )
)

:: Server'ı başlat
echo [INFO] Server baslatiliyor...
echo.
node server.js

:: Server durursa
echo.
echo ==================================================
echo Server durdu. Devam etmek icin bir tusa basin...
echo ==================================================
pause
