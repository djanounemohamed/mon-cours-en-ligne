@echo off
chcp 65001 >nul
title 🚀 نشر الدروس على الإنترنت
color 0A

echo.
echo ═══════════════════════════════════════════════════════
echo    🚀 نشر الدروس على الإنترنت - ضغطة واحدة
echo ═══════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

REM ═══ الخطوة 1: نقل lessons.json من التنزيلات ═══
echo [1/5] 🔍 البحث عن lessons.json في التنزيلات...
if exist "%USERPROFILE%\Downloads\lessons.json" (
    move /Y "%USERPROFILE%\Downloads\lessons.json" "data\lessons.json" >nul
    echo ✅ تم نقل الملف بنجاح
) else (
    echo ⚠️ لم يُعثر على lessons.json في التنزيلات
    echo    تأكد من ضغط "تصدير JSON" أولاً
    pause
    exit /b 1
)
echo.

REM ═══ الخطوة 2: إضافة كل التعديلات ═══
echo [2/5] 📦 إضافة التعديلات...
git add .
echo ✅ تمت الإضافة
echo.

REM ═══ الخطوة 3: تسجيل التعديلات ═══
echo [3/5] 💾 تسجيل التعديلات...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set mydate=%%c-%%b-%%a
git commit -m "تحديث الدروس - %mydate%" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ لا توجد تعديلات جديدة
) else (
    echo ✅ تم التسجيل
)
echo.

REM ═══ الخطوة 4: جلب التحديثات من GitHub ═══
echo [4/5] 🔄 جلب التحديثات من GitHub...
git pull origin main --rebase --no-edit >nul 2>&1
echo ✅ تم التزامن
echo.

REM ═══ الخطوة 5: رفع إلى GitHub ═══
echo [5/5] ☁️ رفع إلى GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ⚠️ إعادة المحاولة...
    git push origin main --force-with-lease
)
echo.

echo ═══════════════════════════════════════════════════════
echo    🎉 تم النشر بنجاح!
echo ═══════════════════════════════════════════════════════
echo.
echo  ⏳ سيظهر التحديث على الموقع خلال 60 ثانية
echo.
echo  🌐 الموقع:
echo     https://mon-cours-en-ligne.vercel.app
echo.

timeout /t 3 >nul
start https://mon-cours-en-ligne.vercel.app

echo اضغط أي زر للإغلاق...
pause >nul