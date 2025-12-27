import requests
import re
import json
import os
import subprocess
from bs4 import BeautifulSoup
from datetime import datetime

JSON_FILENAME = "lottery_data.json"

def run_scraper():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    today_str = datetime.now().strftime("%Y-%m-%d")
    scraped_data = [] 
    
    print("--- INICIANDO SCRAPING LOCAL ---")

    # ==========================================
    # 1. TRIPLES
    # ==========================================
    print(">>> Buscando Triples...")
    url_triples = "https://www.loteriadehoy.com/loterias/resultados/"
    map_triples = {
        'Triple Zulia': 'Triple Zulia', 'Triple Chance': 'Triple Chance', 
        'Triple Caracas': 'Triple Caracas', 'Triple Zamorano': 'Triple Zamorano', 
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
                                    # GUARDAR EN LISTA
                                    scraped_data.append({
                                        "lottery": detected_name,
                                        "time": clean_time,
                                        "result": final_val,
                                        "date": today_str
                                    })
    except Exception as e:
        print(f"Error Triples: {e}")

    # ==========================================
    # 2. ANIMALITOS
    # ==========================================
    print(">>> Buscando Animalitos...")
    url_animals = "https://www.loteriadehoy.com/animalitos/resultados/"
    map_animals = {
        'Lotto Activo': 'Lotto Activo', 'La Granjita': 'Granjita',
        'Selva Plus': 'Selva Plus', 'El Guacharito Millonario': 'Guacharito',
        'Guacharo Activo': 'Guacharo', 'Loto Chaima': 'Lotto Chaima',
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

            detected_animal = None
            for key, val in map_animals.items():
                if key.lower() in web_name.lower():
                    remainder = web_name.lower().replace(key.lower(), "")
                    if any(c.isalnum() for c in remainder): continue
                    detected_animal = val
                    break
            
            if detected_animal:
                results_row = title_div.find_next_sibling('div', class_='row')
                if results_row:
                    cards = results_row.find_all('div', class_=lambda x: x and 'col-' in x)
                    for card in cards:
                        h5 = card.find('h5')
                        h4 = card.find('h4')
                        if not h5 or not h4: continue
                        
                        raw_time = h5.get_text(strip=True).upper()
                        raw_result = " ".join(h4.get_text().split())
                        time_match = re.search(r'(\d{1,2}:\d{2}\s?(?:AM|PM))', raw_time)
                        
                        if time_match:
                            clean_time = time_match.group(1)
                            res_match = re.match(r'^(\d{1,2}|00)\s+(.+)$', raw_result)
                            if res_match:
                                final_val = f"{res_match.group(1)} - {res_match.group(2)}"
                                scraped_data.append({
                                    "lottery": detected_animal,
                                    "time": clean_time,
                                    "result": final_val,
                                    "date": today_str
                                })
    except Exception as e:
        print(f"Error Animalitos: {e}")

    # ==========================================
    # 3. TÁCHIRA
    # ==========================================
    print(">>> Buscando Táchira...")
    try:
        url_tachira = "https://loteriadehoy.com/loteria/tripletachira/resultados/"
        response = requests.get(url_tachira, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', class_='resultados')
        if table and table.find('tbody'):
            for row in table.find('tbody').find_all('tr'):
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
                            final_val = f"{num_match.group(1)} {letter}"
                            scraped_data.append({
                                "lottery": 'Triple Tachira',
                                "time": clean_time,
                                "result": final_val,
                                "date": today_str
                            })
    except Exception as e:
        print(f"Error Táchira: {e}")

    # ==========================================
    # 4. CONDOR
    # ==========================================
    print(">>> Buscando Condor...")
    try:
        url_condor = "https://tripletachira.com/condor.php"
        condor_hours = {'9':'09:00 AM','10':'10:00 AM','11':'11:00 AM','12':'12:00 PM','1':'01:00 PM','2':'02:00 PM','3':'03:00 PM','4':'04:00 PM','5':'05:00 PM','6':'06:00 PM','7':'07:00 PM'}
        
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
                            scraped_data.append({
                                "lottery": 'Condor',
                                "time": draw_time,
                                "result": final_val,
                                "date": today_str
                            })
    except Exception as e:
        print(f"Error Condor: {e}")

    # ==========================================
    # GUARDADO Y SUBIDA A GITHUB
    # ==========================================
    print(f"Total encontrados: {len(scraped_data)}")
    
    with open(JSON_FILENAME, 'w', encoding='utf-8') as f:
        json.dump(scraped_data, f, indent=4, ensure_ascii=False)
    print(f"Archivo {JSON_FILENAME} actualizado.")

    try:
        print("Subiendo a GitHub...")
        subprocess.run(["git", "add", JSON_FILENAME], check=True)
        subprocess.run(["git", "commit", "-m", f"Auto-update resultados: {today_str}"], check=True)
        subprocess.run(["git", "push"], check=True)
        print("¡Éxito! Datos subidos a GitHub.")
    except subprocess.CalledProcessError as e:
        print("Nota: Si dice 'nothing to commit', es que no hubo cambios nuevos.")
        print(f"Detalle Git: {e}")
    except Exception as e:
        print(f"Error al subir a Git: {e}")

if __name__ == "__main__":
    run_scraper()