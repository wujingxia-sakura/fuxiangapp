@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo 浮想 · 本机地址
echo   电脑：http://127.0.0.1:8765
echo.
echo   手机（同一 Wi-Fi）可以试：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  if not "!IP!"=="" echo     http://!IP!:8765
)
echo.
echo 如果手机打不开：检查 Windows 防火墙是否允许 Python；
echo 或者把整个文件夹拖到 https://app.netlify.com/drop 部署成 HTTPS 网址。
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  echo 正在启动本地服务...
  start "" http://127.0.0.1:8765
  python -m http.server 8765 --bind 0.0.0.0
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo 正在启动本地服务...
  start "" http://127.0.0.1:8765
  py -3 -m http.server 8765 --bind 0.0.0.0
  goto :eof
)

echo 没有找到 Python。
echo.
echo 你可以：
echo 1. 直接双击 index.html 打开（部分浏览器会限制本地存储）；
echo 2. 安装 Python 后再双击本文件；
echo 3. 把整个文件夹拖到 https://app.netlify.com/drop 部署。
echo.
pause
