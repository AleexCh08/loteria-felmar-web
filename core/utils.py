import requests, re, json
from bs4 import BeautifulSoup
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Result, Ticket

def scrape_lottery_results():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    today = timezone.localtime(timezone.now()).date()
    log_messages = []
    count = 0

    # ==========================================
    # PARTE 1: TRIPLES (Tablas)
    # ==========================================
    url_triples = "https://www.loteriadehoy.com/loterias/resultados/"
    map_triples = {
        'Triple Zulia': 'Triple Zulia', 
        'Triple Chance': 'Triple Chance', 
        'Triple Caracas': 'Triple Caracas',
        'Triple Zamorano': 'Triple Zamorano', 
        'Triple Caliente': 'Triple Caliente', 
    }

    try:
        response = requests.get(url_triples, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        tables = soup.find_all('table', class_='resultados')
        
        for table in tables:
            th = table.find('th')
            if not th: continue
            header_text = th.get_text(strip=True)
            
            detected_name = None
            for web_name, db_name in map_triples.items():
                if web_name.lower() in header_text.lower():
                    detected_name = db_name
                    break
            
            if detected_name:
                rows = table.find('tbody').find_all('tr') if table.find('tbody') else []
                for row in rows:
                    if 'ingrid' in row.get('class', []): continue
                    cols = row.find_all('td')
                    if len(cols) < 2: continue
                    
                    raw_time = cols[0].get_text(strip=True).upper()
                    time_match = re.search(r'(\d{1,2}:\d{2}\s?(?:AM|PM))', raw_time)
                    
                    if time_match:
                        clean_time = time_match.group(1)
                        if detected_name == 'Triple Zamorano':
                            target_columns = [(1, 'A'), (2, 'C')]
                        else:
                            target_columns = [(1, 'A'), (2, 'B'), (3, 'C')]
                        for col_idx, letter in target_columns:
                            if len(cols) > col_idx:
                                raw_val = cols[col_idx].get_text(strip=True)
                                num_match = re.search(r'\b(\d{3})\b', raw_val)
                                if num_match:
                                    final_val = f"{num_match.group(1)} {letter}"
                                    obj, created = Result.objects.get_or_create(
                                        lottery=detected_name, draw_time=clean_time, result_value=final_val, date=today,
                                        defaults={'is_manual': False}
                                    )
                                    if created:
                                        count += 1
                                        log_messages.append(f"[TRIPLE] {detected_name} {clean_time} -> {final_val}")

    except Exception as e:
        log_messages.append(f"Error Triples: {str(e)}")

    # ==========================================
    # PARTE 2: ANIMALITOS (Tarjetas)
    # ==========================================
    url_animals = "https://www.loteriadehoy.com/animalitos/resultados/"
    map_animals = {
        'Lotto Activo': 'Lotto Activo',
        'La Granjita': 'Granjita',
        'Selva Plus': 'Selva Plus',
        'El Guacharito Millonario': 'Guacharito',
        'Guacharo Activo': 'Guacharo',
        'Loto Chaima': 'Lotto Chaima',
        'Lotto Rey': 'Lotto Rey',     
    }

    try:
        response = requests.get(url_animals, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        title_divs = soup.find_all('div', class_='title-center')
        
        for title_div in title_divs:
            h3 = title_div.find('h3')
            if not h3: continue
            
            web_name = h3.get_text(strip=True)

            detected_animal_lottery = None
            for key, val in map_animals.items():
                if key.lower() in web_name.lower():
                    remainder = web_name.lower().replace(key.lower(), "")
                    if any(c.isalnum() for c in remainder):
                        continue
                    detected_animal_lottery = val
                    break
            
            if detected_animal_lottery:
                results_row = title_div.find_next_sibling('div', class_='row')
                
                if results_row:
                    cards = results_row.find_all('div', class_=lambda x: x and 'col-' in x)
                    
                    for card in cards:
                        h5 = card.find('h5')
                        if not h5: continue
                        raw_time = h5.get_text(strip=True).upper()

                        h4 = card.find('h4')
                        if not h4: continue
                        raw_result = " ".join(h4.get_text().split()) 
                        
                        time_match = re.search(r'(\d{1,2}:\d{2}\s?(?:AM|PM))', raw_time)
                        
                        if time_match:
                            clean_time = time_match.group(1)

                            res_match = re.match(r'^(\d{1,2}|00)\s+(.+)$', raw_result)
                            
                            if res_match:
                                num = res_match.group(1)
                                name = res_match.group(2)
                                final_val = f"{num} - {name}"
                                
                                obj, created = Result.objects.get_or_create(
                                    lottery=detected_animal_lottery,
                                    draw_time=clean_time,
                                    date=today,
                                    defaults={'result_value': final_val, 'is_manual': False}
                                )
                                
                                if created:
                                    count += 1
                                    log_messages.append(f"[ANIMAL] {detected_animal_lottery} {clean_time} -> {final_val}")
                                elif obj.result_value != final_val:
                                    obj.result_value = final_val
                                    obj.save()

    except Exception as e:
        log_messages.append(f"Error Animalitos: {str(e)}")

    # ==========================================
    # PARTE 3: TÁCHIRA (URL ESPECÍFICA)
    # ==========================================
    try:
        url_tachira = "https://loteriadehoy.com/loteria/tripletachira/resultados/"
        
        response = requests.get(url_tachira, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        table = soup.find('table', class_='resultados')
        
        if table and table.find('tbody'):
            rows = table.find('tbody').find_all('tr')
            
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 4: continue 
                raw_time = cols[0].get_text(strip=True).upper()
                time_match = re.search(r'(\d{1,2}:\d{2}\s?(?:AM|PM))', raw_time)
                
                if time_match:
                    clean_time = time_match.group(1)
                    target_columns = [(1, 'A'), (2, 'B'), (3, 'C')]
                    
                    for col_idx, letter in target_columns:
                        raw_val = cols[col_idx].get_text(strip=True) 
                        num_match = re.search(r'\b(\d{3})\b', raw_val)
                        
                        if num_match:
                            number = num_match.group(1)
                            final_val = f"{number} {letter}"
                            
                            obj, created = Result.objects.get_or_create(
                                lottery='Triple Tachira', 
                                draw_time=clean_time, 
                                result_value=final_val, 
                                date=today,
                                defaults={'is_manual': False}
                            )
                            if created:
                                count += 1
                                log_messages.append(f"[TACHIRA_EXT] Triple Táchira {clean_time} -> {final_val}")

    except Exception as e:
        log_messages.append(f"Error Táchira Específico: {str(e)}")

    # ==================
    # PARTE 4: CÓNDOR 
    # ==================
    try:
        url_condor = "https://tripletachira.com/condor.php"

        condor_hours = {
            '9':  '09:00 AM',
            '10': '10:00 AM',
            '11': '11:00 AM',
            '12': '12:00 PM',
            '1':  '01:00 PM',
            '2':  '02:00 PM',
            '3':  '03:00 PM',
            '4':  '04:00 PM',
            '5':  '05:00 PM',
            '6':  '06:00 PM',
            '7':  '07:00 PM'
        }

        response = requests.get(url_condor, headers=headers, timeout=10)
        pattern = r"var tipos = JSON\.stringify\('(\[.*?\])'\);"
        match = re.search(pattern, response.text)

        if match:
            json_str = match.group(1).replace("\\", "")
            data = json.loads(json_str)

            for item in data:
                raw_id = item.get('id', '') 

                if raw_id.startswith('CondorGana'):
                    draw_num = raw_id.replace('CondorGana', '')
                    
                    if draw_num in condor_hours:
                        draw_time = condor_hours[draw_num]
                        number = item.get('N', '').strip()
                        name = item.get('S', '').strip()

                        if number and name:
                            final_val = f"{number} - {name.title()}"
                            
                            obj, created = Result.objects.get_or_create(
                                lottery='Condor', 
                                draw_time=draw_time, 
                                date=today,
                                defaults={'result_value': final_val, 'is_manual': False}
                            )
                            if created:
                                count += 1
                                log_messages.append(f"[CONDOR_OK] Condor {draw_time} -> {final_val}")

    except Exception as e:
        log_messages.append(f"Error Condor: {str(e)}")

    if count > 0:
        return True, f"¡Proceso Terminado! {count} nuevos resultados.\n" + "\n".join(log_messages)
    elif log_messages:
        return True, "Escaneo listo. Sin novedades (validado Triples y Animalitos)."
    else:
        return True, "Escaneo listo. No se encontraron datos nuevos."

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