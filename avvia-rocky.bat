@echo off
chcp 65001 >nul
title Rocky
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

if not exist "node_modules\electron" (
  echo.
  echo Prima installazione delle dipendenze: puo' richiedere qualche minuto...
  echo.
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Installazione non riuscita. Controlla la connessione e riprova.
    echo.
    pause
    exit /b 1
  )
)

call npm.cmd start
