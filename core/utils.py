import requests, re, json
from bs4 import BeautifulSoup
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Result, Ticket

GITHUB_RAW_URL = "https://raw.githubusercontent.com/AleexCh08/loteria-felmar-web/feature-api-github/lottery_data.json"

def scrape_lottery_results():
    log_messages = []
    count = 0
    today = timezone.localtime(timezone.now()).date()

    try:
        response = requests.get(GITHUB_RAW_URL, timeout=15)
        response.raise_for_status() 
        
        data = response.json() 

        for item in data:
            lottery_name = item['lottery']
            draw_time = item['time']
            result_val = item['result']
            
            obj, created = Result.objects.get_or_create(
                lottery=lottery_name,
                draw_time=draw_time,
                date=today, 
                defaults={
                    'result_value': result_val,
                    'is_manual': False
                }
            )

            if created:
                count += 1
                log_messages.append(f"[{lottery_name}] {draw_time} -> {result_val}")
            elif obj.result_value != result_val:
                obj.result_value = result_val
                obj.save()
                log_messages.append(f"[CORRECCIÓN] {lottery_name} {draw_time} -> {result_val}")

    except Exception as e:
        return False, f"Error conectando a GitHub: {str(e)}"

    if count > 0:
        return True, f"¡Sincronizado con GitHub! {count} resultados nuevos.\n" + "\n".join(log_messages)
    else:
        return True, "Sincronizado con GitHub. Sin datos nuevos."

def check_ticket_results():
    pending_tickets = Ticket.objects.filter(status='pendiente')
    processed_count = 0

    name_map = {
        'Chance': 'Triple Chance',
        'Zulia': 'Triple Zulia',
        'Caracas': 'Triple Caracas',
        'Táchira': 'Triple Tachira',
        'Tachira': 'Triple Tachira',
        'Zamorano': 'Triple Zamorano',
        'Caliente': 'Triple Caliente',
        'Guacharito': 'Guacharito',
        'La Granjita': 'Granjita',
        'Cóndor': 'Condor',
        'El Guácharo': 'Guacharo',
    }

    for ticket in pending_tickets:
        play_date = ticket.created_at.date()
        search_name = name_map.get(ticket.lottery, ticket.lottery)
        
        # =======================================================
        # 1. OBTENER RESULTADOS (HOY Y MAÑANA)
        # =======================================================
        next_day = play_date + timedelta(days=1)
        
        results_day0 = Result.objects.filter(lottery=search_name, date=play_date)
        results_day1 = Result.objects.filter(lottery=search_name, date=next_day)

        if not results_day0.exists() and not results_day1.exists():
            continue

        def get_full_dt(r_date, r_time_str):
            try:
                t = datetime.strptime(r_time_str, "%I:%M %p").time()
                return datetime.combine(r_date, t)
            except ValueError:
                return None

        all_results_timeline = []
        for r in results_day0:
            dt = get_full_dt(r.date, r.draw_time)
            if dt: all_results_timeline.append((dt, r))
        
        for r in results_day1:
            dt = get_full_dt(r.date, r.draw_time)
            if dt: all_results_timeline.append((dt, r))
            
        all_results_timeline.sort(key=lambda x: x[0])

        # =======================================================
        # 2. LÓGICA POR TIPO DE JUEGO
        # =======================================================
        is_winner = False
        should_close_ticket = False 
        
        try:
            ticket_dt_ref = datetime.strptime(f"{play_date} {ticket.draw_time}", "%Y-%m-%d %I:%M %p")
        except:
            continue

        if ticket.game_type == 'animalitos':
            ticket_val = ticket.play_value.upper().strip()
            
            if ticket.bet_type == 'single':
                specific_result = None
                for dt, res in all_results_timeline:
                    if dt == ticket_dt_ref:
                        specific_result = res
                        break
                
                if specific_result:
                    should_close_ticket = True
                    if ticket_val == specific_result.result_value.upper().strip():
                        is_winner = True
                else:
                    continue 

            elif ticket.bet_type == 'tripleta':
                picks = set([ticket_val])
                if ticket.extras:
                    picks.update([x.strip().upper() for x in ticket.extras.split(',')])
                
                valid_window = []
                for dt, res in all_results_timeline:
                    if dt >= ticket_dt_ref: 
                        valid_window.append(res)
                
                window_11 = valid_window[:11]

                hit_animals = set()
                for res in window_11:
                    hit_animals.add(res.result_value.upper().strip())

                if picks.issubset(hit_animals):
                    is_winner = True
                    should_close_ticket = True # 
                else:
                    if len(window_11) >= 11:
                         should_close_ticket = True
                    elif (timezone.now().date() > next_day):
                         should_close_ticket = True
                    else:
                        continue

        # --- CASO C: TRIPLES (Lógica estándar) ---
        elif ticket.game_type == 'triples':
            result = None
            for dt, res in all_results_timeline:
                if dt == ticket_dt_ref:
                    result = res
                    break
            
            if not result: continue 
            
            should_close_ticket = True
            res_value = result.result_value.upper()
            match = re.match(r'(\d+)\s+([A-Z])', res_value)
            
            if match:
                res_num, res_let = match.group(1), match.group(2)
                ticket_num = ticket.play_value
                ticket_extras = ticket.extras.upper() if ticket.extras else ""

                if ticket.bet_type == 'triple':
                    if ticket_num == res_num and (res_let in ticket_extras): is_winner = True
                elif ticket.bet_type == 'terminal':
                    if res_num.endswith(ticket_num) and (res_let in ticket_extras): is_winner = True
                elif ticket.bet_type == 'permuta':
                    if sorted(ticket_num) == sorted(res_num): is_winner = True

        # =======================================================
        # 3. VALIDACIÓN ANTI-FRAUDE Y PAGOS
        # =======================================================
        if should_close_ticket:
            draw_dt_aware = timezone.make_aware(ticket_dt_ref)
            if ticket.created_at > draw_dt_aware:
                 ticket.status = 'perdedor'
                 ticket.save()
                 processed_count += 1
                 continue

            if is_winner:
                ticket.status = 'ganador'
                
                multiplier = 0
                if ticket.game_type == 'triples':
                    multiplier = 35 if ticket.bet_type == 'terminal' else 60
                elif ticket.game_type == 'animalitos':
                    multiplier = 50 if ticket.bet_type == 'tripleta' else 30
                
                prize = ticket.amount * multiplier
                ticket.user.profile.balance += prize
                ticket.user.profile.save()
            else:
                ticket.status = 'perdedor'
            
            ticket.save()
            processed_count += 1

    return processed_count