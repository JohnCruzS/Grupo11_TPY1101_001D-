@echo off
chcp 65001 >nul
echo.
echo ===========================================
echo   MIGRACION - SotLoy Conecta
echo ===========================================
echo.
echo Este script ejecutara el SQL en tu base de datos de Supabase.
echo.
echo OPCION 1: Usar Supabase CLI (si esta instalado)
echo OPCION 2: Instrucciones manuales
echo.
echo ===========================================
echo.

:menu
echo Selecciona una opcion:
echo.
echo 1. Usar Supabase CLI (requiere supabase CLI instalado)
echo 2. Ver instrucciones para ejecucion manual
echo 3. Salir
echo.
set /p option="Opcion (1-3): "

if "%option%"=="1" goto cli
if "%option%"=="2" goto manual
if "%option%"=="3" goto exit
goto menu

:cli
echo.
echo Verificando Supabase CLI...
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Supabase CLI no encontrado.
    echo Instalalo desde: https://github.com/supabase/cli
    pause
    goto menu
)

echo.
echo ✅ Supabase CLI detectado
echo.
echo Ejecutando SQL...
echo.

supabase db execute --file ..\src\app\database\schema_complete.sql

if errorlevel 1 (
    echo.
    echo ❌ Error ejecutando SQL
    echo Intenta la opcion manual.
    pause
    goto menu
) else (
    echo.
    echo ✅ SQL ejecutado exitosamente!
    pause
    goto exit
)

:manual
echo.
echo ===========================================
echo   INSTRUCCIONES MANUALES
echo ===========================================
echo.
echo Metodo recomendado (mas seguro):
echo.
echo 1. Abre tu navegador y ve a:
echo    https://supabase.com/dashboard
echo.
echo 2. Selecciona tu proyecto
echo.
echo 3. Ve a: SQL Editor ^> New query
echo.
echo 4. Abre el archivo:
echo    src\app\database\schema_complete.sql
echo.
echo 5. Copia TODO el contenido
echo.
echo 6. Pegalo en el SQL Editor
echo.
echo 7. Haz clic en "RUN"
echo.
echo ===========================================
echo.
echo Si todo sale bien, veras:
echo ✅ Tablas creadas: empleados, cargas,
echo    documento_version, subscriptions,
echo    payments, notificaciones
echo.
echo ✅ Columnas agregadas a documents y enterprises
echo.
echo ===========================================
echo.
pause
goto menu

:exit
echo.
echo Saliendo...
timeout /t 2 >nul
