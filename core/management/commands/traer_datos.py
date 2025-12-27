from django.core.management.base import BaseCommand
from core.utils import scrape_lottery_results

class Command(BaseCommand):
    help = 'Descarga los datos de GitHub y los guarda en la BD'

    def handle(self, *args, **kwargs):
        self.stdout.write("Iniciando sincronización...")
        exito, mensaje = scrape_lottery_results()
        
        if exito:
            self.stdout.write(self.style.SUCCESS(f'LISTO: {mensaje}'))
        else:
            self.stdout.write(self.style.ERROR(f'ERROR: {mensaje}'))