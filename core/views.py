import json, itertools
from decimal import Decimal
from datetime import timedelta, datetime
from django.db import transaction
from django.core.paginator import Paginator
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib.auth import login, update_session_auth_hash, logout
from django.contrib.admin.views.decorators import staff_member_required
from .forms import UserLoginForm, UserRegisterForm, UserUpdateForm
from .utils import scrape_lottery_results, check_ticket_results
from .models import Ticket, Result, Payment

def home(request):
    return render(request, 'core/home.html')

def login_view(request):
    if request.user.is_authenticated:  
        return redirect('dashboard')
    
    initial_data = {}
    if 'saved_username' in request.COOKIES:
        initial_data = {
            'username': request.COOKIES['saved_username'], 
            'remember_me': True
        }

    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            remember_me = form.cleaned_data.get('remember_me')
            response = redirect('dashboard')
            if remember_me:
                response.set_cookie('saved_username', user.username, max_age=2592000)
            else:
                response.delete_cookie('saved_username')
            return response
    else:
        form = UserLoginForm(initial=initial_data)

    return render(request, 'core/login.html', {'form': form})

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        
        if form.is_valid():
            form.save() 
            return render(request, 'core/register.html', {
                'form': UserRegisterForm(), 
                'success': True
            })
        else:
            messages.error(request, "Por favor corrige los errores en el formulario.")
    else:
        form = UserRegisterForm()
    return render(request, 'core/register.html', {'form': form})


def forgot_password_view(request):
    return render(request, 'core/forgot_password.html')

def results_view(request):
    now_local = timezone.localtime(timezone.now()).date()
    
    date_str = request.GET.get('date')
    if date_str:
        try:
            filter_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            filter_date = now_local
    else:
        filter_date = now_local

    if filter_date == now_local:
        date_label = "Hoy"
    elif filter_date == now_local - timedelta(days=1):
        date_label = "Ayer"
    else:
        date_label = filter_date.strftime("%d/%m")

    results_qs = Result.objects.filter(date=filter_date).order_by('lottery', 'draw_time')

    animal_icons = {
        'delfin': 'noto:dolphin', 'ballena': 'noto:spouting-whale', 'carnero': 'noto:ram',
        'toro': 'noto:ox', 'ciempies': 'game-icons:centipede', 'alacran': 'noto:scorpion',
        'leon': 'noto:lion', 'rana': 'noto:frog', 'perico': 'noto:parrot',
        'raton': 'noto:mouse', 'aguila': 'noto:eagle', 'tigre': 'noto:tiger-face',
        'gato': 'noto:cat', 'caballo': 'noto:horse', 'mono': 'noto:monkey',
        'paloma': 'noto:dove', 'zorro': 'noto:fox', 'oso': 'noto:bear',
        'pavo': 'noto:turkey', 'burro': 'noto:donkey', 'chivo': 'noto:goat',
        'cochino': 'noto:pig', 'gallo': 'noto:rooster', 'camello': 'noto:camel',
        'cebra': 'noto:zebra', 'iguana': 'noto:dragon', 'gallina': 'noto:chicken',
        'vaca': 'noto:cow', 'perro': 'noto:dog', 'zamuro': 'game-icons:vulture',
        'elefante': 'noto:elephant', 'caiman': 'noto:lizard', 'lapa': 'noto:beaver',
        'ardilla': 'noto:chipmunk', 'pescado': 'noto:fish', 'venado': 'noto:deer',
        'jirafa': 'noto:giraffe', 'culebra': 'noto:snake', 'tortuga': 'noto:turtle',
        'bufalo': 'game-icons:buffalo-head', 'lechuza': 'noto:owl', 'avispa': 'game-icons:wasp-sting',
        'canguro': 'noto:kangaroo', 'tucan': 'game-icons:toucan', 'mariposa': 'noto:butterfly',
        'chiguire': 'game-icons:bear-head', 'garza': 'noto:flamingo', 'puma': 'game-icons:lynx-head',
        'pavo real': 'noto:peacock', 'puercoespin': 'game-icons:porcupine', 'pereza': 'noto:sloth',
        'canario': 'noto:baby-chick', 'pelicano': 'game-icons:eating-pelican', 'pulpo': 'noto:octopus',       
        'caracol': 'noto:snail', 'grillo': 'noto:cricket', 'oso hormiguero': 'game-icons:anteater',       
        'tiburon': 'noto:shark', 'pato': 'noto:duck', 'hormiga': 'noto:ant',
        'pantera': 'game-icons:saber-toothed-cat-head', 'camaleon': 'game-icons:gecko', 'panda': 'noto:panda',
        'cachicamo': 'game-icons:armadillo-tail', 'cangrejo': 'noto:crab', 'gavilan': 'game-icons:hawk-emblem',
        'araña': 'noto:spider', 'lobo': 'noto:wolf', 'avestruz': 'game-icons:ostrich',
        'jaguar': 'noto:leopard', 'conejo': 'noto:rabbit', 'bisonte': 'noto:bison',
        'guacamaya': 'game-icons:parrot-head', 'gorila': 'noto:gorilla', 'hipopotamo': 'noto:hippopotamus',
        'turpial': 'openmoji:bird', 'guacharo': 'game-icons:swallow', 'rinoceronte':'noto:rhinoceros',
        'pinguino': 'noto:penguin', 'antilope':'noto:water-buffalo', 'calamar': 'noto:squid',
        'murcielago': 'noto:bat', 'cuervo':'game-icons:raven', 'cucaracha': 'noto:cockroach',
        'buho':'noto:owl', 'camaron':'noto:shrimp', 'hamster':'noto:hamster',
        'buey': 'noto:ox', 'cabra': 'noto:goat', 'erizo de mar':'game-icons:urchin',
        'anguila':'game-icons:eel', 'huron':'openmoji:ferret', 'morrocoy':'game-icons:tortoise',          
        'cisne': 'noto:swan', 'gaviota':'game-icons:seagull', 'paujil':'game-icons:rooster',
        'escarabajo':'noto:beetle', 'caballito de mar':'game-icons:seahorse', 'loro':'openmoji:parrot',
        'cocodrilo':'noto:crocodile', 'guacharito':'noto:hatching-chick', 'zebra': 'noto:zebra',
        'pavoreal': 'noto:peacock', 'arana': 'noto:spider', 'condor': 'game-icons:eagle-emblem',
    }

    processed_results = []
    
    for res in results_qs:
        name_lower = res.lottery.lower()

        if "triple" in name_lower:
            res.css_class = name_lower.replace("triple ", "").strip()
        else:
            res.css_class = name_lower.replace(" ", "-")

        if " - " in res.result_value:
            res.is_animal = True
            try:
                parts = res.result_value.split(" - ")
                res.animal_number = parts[0]
                res.animal_name = parts[1]

                search_key = res.animal_name.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')
                res.icon = animal_icons.get(search_key, 'noto:paw-prints')
            except:
                res.icon = 'noto:paw-prints'
        else:
            res.is_animal = False
        
        processed_results.append(res)

    return render(request, 'core/results.html', {
        'results': processed_results,
        'current_date': str(filter_date),
        'date_label': date_label          
    })

@login_required(login_url='login')
def dashboard_view(request):
    profile_form = UserUpdateForm(instance=request.user)

    if request.method == 'POST':
        if 'action' in request.POST and request.POST['action'] == 'update_profile':
            profile_form = UserUpdateForm(request.POST, instance=request.user)
            
            if profile_form.is_valid():
                user = profile_form.save()
                if profile_form.cleaned_data.get('new_password'):
                    update_session_auth_hash(request, user)
                
                messages.success(request, "¡Datos de seguridad actualizados correctamente!")
                return redirect('dashboard')
            else:
                messages.error(request, "Error al actualizar. Verifica los datos.")

    all_tickets = list(Ticket.objects.filter(user=request.user).order_by('-created_at'))
    all_payments = list(Payment.objects.filter(user=request.user).order_by('-created_at'))
    combined = sorted(all_tickets + all_payments, key=lambda x: x.created_at, reverse=True)
    
    recent_movements = combined[:10]

    return render(request, 'core/dashboard.html', {
        'profile_form': profile_form,
        'tickets': all_tickets,    
        'movements': recent_movements,     
    })

@login_required
def history_api(request):
    page_number = request.GET.get('page', 1)
    per_page = 10

    tickets = Ticket.objects.filter(user=request.user).values(
        'id', 'created_at', 'lottery', 'amount', 'status', 'bet_type'
    )
    payments = Payment.objects.filter(user=request.user).values(
        'id', 'created_at', 'reference', 'amount', 'status', 'payment_method'
    )
    
    combined_list = []
    for t in tickets:
        t['type'] = 'ticket'
        combined_list.append(t)
    for p in payments:
        p['type'] = 'payment'
        combined_list.append(p)

    combined_list.sort(key=lambda x: x['created_at'], reverse=True)

    paginator = Paginator(combined_list, per_page)
    page_obj = paginator.get_page(page_number)

    data = []
    for item in page_obj:
        f_date = item['created_at'].strftime("%d/%m/%Y")
        data.append({
            'date': f_date,
            'id': item['id'],
            'type': item['type'],
            'amount': str(item['amount']),
            'status': item['status'],
            'desc': f"Apuesta {item.get('bet_type', '')} {item.get('lottery', '')}" if item['type'] == 'ticket' else f"Recarga {item.get('payment_method', '')}",
            'ref': item.get('reference', '')
        })

    return JsonResponse({
        'movements': data,
        'has_next': page_obj.has_next()
    })

def custom_logout_view(request):
    logout(request) 
    return redirect('login')

@login_required
def create_ticket_api(request):
    try:
        data = json.loads(request.body)
        user = request.user
        items = data.get('tickets', [])
        
        if not items:
            return JsonResponse({'success': False, 'error': 'El carrito está vacío.'})

        tickets_to_create = []
        total_cost = Decimal('0.00')

        for item in items:
            game_type = item.get('details', {}).get('type') 
            bet_type = item.get('details', {}).get('bet_type')
            play_value = item.get('details', {}).get('value')
            extras = item.get('details', {}).get('extras', '')
            
            lottery = item.get('lottery')
            draw_time = item.get('draw_time')
            base_amount = Decimal(str(item.get('amount')))
            if base_amount <= 0:
                return JsonResponse({'success': False, 'error': 'El monto de la apuesta debe ser positivo.'})

            try: 
                draw_dt_obj = datetime.strptime(draw_time, "%I:%M %p").time()               
                now_local = timezone.localtime(timezone.now()) 
                draw_full_date = now_local.replace(
                    hour=draw_dt_obj.hour, 
                    minute=draw_dt_obj.minute, 
                    second=0, 
                    microsecond=0
                )
                cutoff_time = draw_full_date - timedelta(minutes=5)
                if now_local >= cutoff_time:
                    return JsonResponse({
                        'success': False, 
                        'error': f'El sorteo de las {draw_time} ya cerró (Hora Servidor).'
                    })
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Formato de hora inválido.'}) 

            current_item_tickets = []
            
            if game_type == 'triples':
                letters = item.get('details', {}).get('letters', [])
                numbers_to_play = []
                if bet_type == 'permuta':
                    perms = set([''.join(p) for p in itertools.permutations(play_value)])
                    numbers_to_play = list(perms)
                else:
                    numbers_to_play = [play_value]

                for letter in letters:
                    for num in numbers_to_play:
                        t = Ticket(
                            user=user,
                            game_type=game_type,
                            bet_type='triple' if bet_type == 'permuta' else bet_type,
                            play_value=num,
                            extras=letter,
                            amount=base_amount,
                            lottery=lottery,
                            draw_time=draw_time,
                            status='pendiente'
                        )
                        current_item_tickets.append(t)
            else:
                t = Ticket(
                    user=user,
                    game_type=game_type,
                    bet_type=bet_type,
                    play_value=play_value,
                    extras=extras,
                    amount=base_amount,
                    lottery=lottery,
                    draw_time=draw_time,
                    status='pendiente'
                )
                current_item_tickets.append(t)

            tickets_to_create.extend(current_item_tickets)
            total_cost += base_amount * len(current_item_tickets)

        if user.profile.balance < total_cost:
             return JsonResponse({
                 'success': False, 
                 'error': f'Saldo insuficiente para la compra total. Costo: {total_cost}, Tienes: {user.profile.balance}'
             })

        with transaction.atomic():
            user.profile.balance -= total_cost
            user.profile.save()
            
            Ticket.objects.bulk_create(tickets_to_create)
        
        return JsonResponse({
            'success': True, 
            'count': len(tickets_to_create),
            'message': f'¡Éxito! Se han procesado {len(tickets_to_create)} tickets.'
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@staff_member_required 
def trigger_scraping(request):
    success, message = scrape_lottery_results()
    return JsonResponse({'success': success, 'message': message})

@login_required
@require_POST
def request_recharge(request):
    try:
        data = json.loads(request.body)

        amount = Decimal(str(data.get('amount', 0)))
        if amount <= 0:
            return JsonResponse({'success': False, 'error': 'El monto debe ser positivo.'})
        
        Payment.objects.create(
            user=request.user,
            amount=amount,
            reference=data.get('reference'),
            payment_date=data.get('payment_date'),
            payment_method=data.get('payment_method', 'pago_movil')
        )
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
def check_session_status(request):
    return JsonResponse({'is_active': request.user.is_authenticated})

@staff_member_required
def trigger_verification(request):
    count = check_ticket_results()
    messages.success(request, f'¡Proceso completado! Se han verificado y procesado {count} tickets pendientes.')
    return redirect(request.META.get('HTTP_REFERER', 'admin:index'))
