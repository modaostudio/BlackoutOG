@echo off
cd /d "%~dp0"
echo.
echo  Blackout OG — local server
echo  URL:  http://127.0.0.1:8080/
echo  Stop: Ctrl+C
echo.
python -m http.server 8080 --bind 127.0.0.1
if errorlevel 1 py -3 -m http.server 8080 --bind 127.0.0.1
if errorlevel 1 (
  echo Could not run Python. Install Python 3 from python.org
  pause
)
