from django.core.management.base import BaseCommand
from core.utils import scrape_lottery_results, check_ticket_results
from core.models import Ticket

class Command(BaseCommand):
    help = 'Descarga los datos de GitHub y los guarda en la BD'

    def handle(self, *args, **kwargs):
        self.stdout.write("Iniciando sincronización...")
        exito, mensaje = scrape_lottery_results()
        
        if exito:
            self.stdout.write(self.style.SUCCESS(f'LISTO: {mensaje}'))
        else:
            self.stdout.write(self.style.ERROR(f'ERROR: {mensaje}'))

        if Ticket.objects.filter(status='pendiente').exists():
            self.stdout.write(self.style.WARNING("Se detectaron tickets pendientes. Iniciando verificación..."))
            processed = check_ticket_results()
            self.stdout.write(self.style.SUCCESS(f"Verificación completada: {processed} tickets procesados."))
        else:
            self.stdout.write(self.style.SUCCESS("No hay tickets pendientes. Se omite la verificación."))