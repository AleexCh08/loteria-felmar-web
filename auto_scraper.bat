@echo off
cd /d "C:\Users\alex_\Documents\Clases\Pasantias\proyecto_loteria"
call venv\Scripts\activate
python local_scraper.py
timeout /t 5 /nobreak
python manage.py traer_datos
exit