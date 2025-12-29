from django.contrib import admin
from django.urls import path
from django.views.generic import TemplateView
from core.views import (home, login_view, register_view, 
forgot_password_view, dashboard_view, results_view, 
custom_logout_view, create_ticket_api, trigger_scraping, 
request_recharge, check_session_status, trigger_verification, history_api)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='home'),
    path('login/', login_view, name='login'),
    path('salir/', custom_logout_view, name='logout'),
    path('registro/', register_view, name='register'),         
    path('recuperar/', forgot_password_view, name='forgot_password'),
    path('dashboard/', dashboard_view, name='dashboard'),
    path('results/', results_view, name='results'),
    path('api/create-ticket/', create_ticket_api, name='create_ticket_api'),
    path('api/scrape-results/', trigger_scraping, name='trigger_scraping'),
    path('api/recharge/', request_recharge, name='request_recharge'),
    path('api/check-session/', check_session_status, name='check_session'),
    path('api/verify-winners/', trigger_verification, name='verify_winners'),
    path('api/history/', history_api, name='history_api'),
    path('service-worker.js', TemplateView.as_view(
        template_name="service-worker.js", 
        content_type='application/javascript'
    ), name='service-worker'),
]
