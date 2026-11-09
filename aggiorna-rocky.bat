@echo off
chcp 65001 >nul
title Rocky - aggiornamento
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js non risulta installato.
  echo Scaricalo da https://nodejs.org ^(versione LTS^) e poi riprova.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo.
  echo Questa cartella non e' un clone git ^(per esempio viene da uno ZIP^).
  echo Scarica lo ZIP aggiornato e copia i file sopra questa cartella,
  echo lasciando stare la cartella node_modules.
  echo.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo Git non risulta installato: scarica lo ZIP aggiornato e copia i file.
  echo.
  pause
  exit /b 1
)

echo.
echo Aggiorno il cane dal repository...
echo.
git pull --ff-only
if errorlevel 1 (
  echo.
  echo Aggiornamento non riuscito: leggi il messaggio qui sopra.
  echo Se hai modificato i file a mano, salva le tue modifiche e riprova.
  echo.
  pause
  exit /b 1
)

echo.
echo Aggiornato. Avvio Rocky...
echo.
call "%~dp0avvia-rocky.bat"
