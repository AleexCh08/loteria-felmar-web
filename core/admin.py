from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from .models import Profile, Ticket, Result, Payment
from .utils import scrape_lottery_results

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Datos del Perfil (Felmar)'
    fk_name = 'user'

class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)

    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_ci')
    
    def get_ci(self, instance):
        return instance.profile.ci
    get_ci.short_description = 'Cédula'

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'lottery', 'play_value', 'draw_time', 'amount', 'created_at', 'status')
    list_filter = ('status', 'lottery', 'created_at')
    search_fields = ('user__username', 'play_value')
    list_editable = ('status',)

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('lottery', 'draw_time', 'result_value', 'date', 'is_manual')
    list_filter = ('date', 'lottery', 'is_manual')
    search_fields = ('lottery', 'result_value')
    list_editable = ('result_value',)

    change_list_template = "admin/core/result/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('run-scraper/', self.admin_site.admin_view(self.run_scraper_view), name='run_scraper'),
        ]
        return custom_urls + urls

    def run_scraper_view(self, request):
        success, message = scrape_lottery_results()

        if success:
            self.message_user(request, message, level=messages.SUCCESS)
        else:
            self.message_user(request, message, level=messages.ERROR)

        url = reverse('admin:core_result_changelist')
        return HttpResponseRedirect(url)
    
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'reference', 'payment_method', 'payment_date', 'status', 'created_at')
    list_filter = ('status', 'payment_method', 'payment_date')
    search_fields = ('user__username', 'reference')
    actions = ['approve_payments', 'reject_payments']

    @admin.action(description='✅ Aprobar y Acreditar Saldo')
    def approve_payments(self, request, queryset):
        count = 0
        for payment in queryset:
            if payment.status == 'pendiente':
                self._process_approval(payment)
                count += 1
        self.message_user(request, f"{count} pagos procesados correctamente.", messages.SUCCESS)

    def save_model(self, request, obj, form, change):
        if change and obj.status == 'aprobado':
            old_obj = Payment.objects.get(pk=obj.pk)
            if old_obj.status == 'pendiente':
                self._process_approval(obj)      
        super().save_model(request, obj, form, change)
    
    def _process_approval(self, payment):
        if not hasattr(payment.user, 'profile'):
            Profile.objects.create(user=payment.user)
            
        profile = payment.user.profile
        profile.balance += payment.amount
        profile.save()
        payment.status = 'aprobado'
        payment.save()

    @admin.action(description='❌ Rechazar Pagos')
    def reject_payments(self, request, queryset):
        queryset.update(status='rechazado')

admin.site.site_header = "Administración Lotería Felmar"
admin.site.site_title = "Admin Felmar"    
admin.site.index_title = "Panel de Control"