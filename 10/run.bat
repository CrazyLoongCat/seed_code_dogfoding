@echo off
chcp 65001 >nul
echo ========================================
echo   BurpSuite 抓包辅助工具 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查 Python 环境...
python --version
if %errorlevel% neq 0 (
    echo 错误: 未找到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/3] 安装后端依赖...
cd backend
pip install -r ../requirements.txt
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)
cd ..
echo.

echo [3/3] 检查前端构建...
if not exist "frontend\dist" (
    echo 前端未构建，开始构建前端...
    cd frontend
    if not exist "node_modules" (
        echo 安装前端依赖...
        call npm install
        if %errorlevel% neq 0 (
            echo 警告: 前端依赖安装失败，请手动运行 npm install
            cd ..
        )
    )
    call npm run build
    if %errorlevel% neq 0 (
        echo 警告: 前端构建失败，请手动运行 npm run build
        cd ..
    )
    cd ..
)
echo.

echo 启动服务...
echo 服务地址: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo.
cd backend
python app.py

pause
