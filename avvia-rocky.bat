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
  rem npm 11 approva gli script di postinstall solo su richiesta esplicita
  call npm.cmd install-scripts approve electron >nul 2>nul
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Installazione non riuscita. Controlla la connessione e riprova.
    echo.
    pause
    exit /b 1
  )
)

rem npm 11+ blocca gli script di postinstall: se il binario manca lo scarichiamo qui
if not exist "node_modules\electron\path.txt" (
  call npm.cmd rebuild electron
)
if not exist "node_modules\electron\path.txt" (
  if exist "node_modules\electron\install.js" (
    echo.
    echo Scarico il binario di Electron...
    echo.
    node "node_modules\electron\install.js"
  )
)

call npm.cmd start
