from django.db import models
from django.contrib.auth.signals import user_logged_in
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    ci = models.CharField(max_length=15, blank=True, null=True, verbose_name="Cédula de Identidad")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Nacimiento") 
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Saldo Disponible")

    last_session_key = models.CharField(max_length=40, null=True, blank=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"
    
    @property
    def age(self):
        if not self.birth_date:
            return 0
        today = date.today()
        age = today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        return age

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('ganador', 'Ganador'),
        ('perdedor', 'No Ganador'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    lottery = models.CharField(max_length=50, verbose_name="Lotería")  
    draw_time = models.CharField(max_length=20, verbose_name="Hora del Sorteo") 
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Jugada")
    game_type = models.CharField(max_length=20)
    bet_type = models.CharField(max_length=30, verbose_name="Tipo de Apuesta") 
    play_value = models.CharField(max_length=50, verbose_name="Número/Animal") 
    extras = models.CharField(max_length=255, blank=True, null=True, verbose_name="Detalles/Permutas")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto Apostado") 
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pendiente')

    class Meta:
        ordering = ['-created_at'] 
        indexes = [
            models.Index(fields=['lottery', 'draw_time']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Ticket #{self.id} - {self.lottery} - {self.play_value}"

class Result(models.Model):
    lottery = models.CharField(max_length=50, verbose_name="Lotería") 
    draw_time = models.CharField(max_length=20, verbose_name="Hora Sorteo") 
    date = models.DateField(auto_now_add=True, verbose_name="Fecha") 

    result_value = models.CharField(max_length=50, verbose_name="Resultado") 
    is_manual = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date', 'lottery', 'draw_time'] 
        indexes = [
            models.Index(fields=['date', 'lottery', 'draw_time']),
        ]

    def __str__(self):
        return f"{self.date} - {self.lottery} {self.draw_time}: {self.result_value}"

class Payment(models.Model):
    STATUS_CHOICES = (
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=50) 
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, default='pago_movil') 
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - Ref: {self.reference} - {self.amount}"

# Señales 
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

@receiver(user_logged_in)
def update_session_key(sender, user, request, **kwargs):
    if hasattr(user, 'profile'):
        user.profile.last_session_key = request.session.session_key
        user.profile.save()