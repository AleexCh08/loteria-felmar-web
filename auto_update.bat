@echo off
:: 1. Entrar a la carpeta del proyecto
cd /d "C:\Users\alex_\Documents\Clases\Pasantias\proyecto_loteria"

:: 2. Activar el entorno virtual (Ajusta la ruta si tu venv está en otro lado)
call venv\Scripts\activate

:: 3. Ejecutar el comando que creamos en el Paso 1
python manage.py traer_datos

:: Esperar 5 seg para ver si hubo error (opcional)
timeout /t 5