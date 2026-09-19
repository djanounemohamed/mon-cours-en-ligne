@echo off
chcp 65001 >nul
title منصة الدروس - سيرفر محلي
color 0A

echo.
echo ═══════════════════════════════════════════════
echo    🎓 منصة الدروس - تشغيل السيرفر المحلي
echo ═══════════════════════════════════════════════
echo.

cd /d "%~dp0"

REM التحقق من وجود Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python غير مثبت على جهازك
    echo.
    echo الرجاء تثبيت Python من: https://www.python.org/downloads/
    echo تأكد من وضع علامة على "Add Python to PATH" أثناء التثبيت
    echo.
    pause
    exit /b 1
)

echo ✅ Python مثبت بنجاح
echo.

REM التحقق من وجود الملفات
if not exist "index.html" (
    echo ❌ الملف index.html غير موجود في هذا المجلد
    echo تأكد أنك تشغّل الملف من داخل مجلد المشروع
    pause
    exit /b 1
)

echo 🚀 جاري تشغيل السيرفر...
echo.
echo 📍 الموقع الرئيسي:      http://localhost:8000
echo 📍 لوحة الإدارة:        http://localhost:8000/admin.html
echo.
echo ═══════════════════════════════════════════════
echo    لإيقاف السيرفر: اضغط Ctrl + C
echo ═══════════════════════════════════════════════
echo.

REM فتح المتصفح بعد 2 ثانية
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8000/admin.html"

REM تشغيل السيرفر
python -m http.server 8000

pause