document.addEventListener('DOMContentLoaded', function() {
    let ticketQueue = [];
    let isPasswordChanged = false;
    let sessionTimer;
    // --- 1. GESTIÓN CENTRALIZADA DE MODALES ---
    function openModal(modal) {
        if(modal) {
            modal.style.display = 'flex';
            setTimeout(() => { modal.classList.add('active'); }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            if (m.classList.contains('active')) { 
                m.classList.remove('active');
                setTimeout(() => { m.style.display = 'none'; }, 300);
            }
        });
        document.body.style.overflow = '';
    }

    // Mapeo de Botones -> Modales
    const modalMap = {
        'btnProfileInfo': 'profileModal',
        'btnHistory': 'historyModal',
        'btnViewAllHistory': 'fullHistoryModal',
        'btnLogout': 'logoutModal'
    };

    Object.keys(modalMap).forEach(btnId => {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalMap[btnId]);
        if(btn && modal) {
            btn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                if (btnId === 'btnHistory') {
                    const today = new Date();
                    const dFilter = document.getElementById('dateFilter');
                    const tFilter = document.getElementById('gameTypeFilter');
                    const lFilter = document.getElementById('ticketFilter');

                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    
                    if(dFilter) dFilter.value = `${year}-${month}-${day}`;
                    if(tFilter) { tFilter.value = 'triples'; tFilter.dispatchEvent(new Event('change')); } 

                    setTimeout(() => { if(typeof filterTickets === 'function') filterTickets(); }, 50);
                }

                openModal(modal); 
            });
        }
    });

    const btnRecharge = document.getElementById('btnRecharge');
    const modalRecharge = document.getElementById('rechargeModal');
    
    if(btnRecharge && modalRecharge) {
        btnRecharge.addEventListener('click', (e) => {
            e.preventDefault();
            resetRechargeForm(); 
            openModal(modalRecharge);
        });
    }

    const closeRechargeBtn = document.querySelector('.close-modal[data-target="rechargeModal"]');
    if (closeRechargeBtn) {
        closeRechargeBtn.addEventListener('click', function() {
            resetRechargeForm(); 
        });
    }

    // FUNCIÓN AUXILIAR PARA LIMPIAR EL FORMULARIO DE RECARGA 
    function resetRechargeForm() {
        const form = document.getElementById('rechargeForm');
        if (form) form.reset();

        const dateInput = document.querySelector('input[name="payment_date"]');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    // --- FUNCIÓN TOAST (Notificación Flotante) ---
    function showMiniToast(message) {
        // 1. Verificar si ya existe el elemento, si no, crearlo
        let toast = document.getElementById("miniToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "miniToast";
            toast.className = "toast-notification";
            document.body.appendChild(toast);
        }

        // 2. Mostrar mensaje
        toast.innerHTML = `<i class="fa-solid fa-check" style="color: #2ecc71;"></i> ${message}`;
        toast.className = "toast-notification show";

        // 3. Ocultar después de 2.5 segundos
        setTimeout(() => { 
            toast.className = toast.className.replace("show", ""); 
        }, 2500);
    }

    // Cierre Global SEGURO (Intercepta si hay tickets en cola)
    function safeCloseCheck(e) {
        if (e && e.preventDefault) e.preventDefault(); 

        const modalTicket = document.getElementById('ticketModal');
        const isTicketModalOpen = modalTicket && modalTicket.style.display !== 'none' && modalTicket.style.display !== '';

        if (isTicketModalOpen && ticketQueue.length > 0) {
            const confirmExit = confirm("Tienes jugadas sin procesar. ¿Seguro que quieres salir? Se perderá el progreso.");
            if (confirmExit) {
                ticketQueue = []; 
                if (typeof renderQueue === 'function') renderQueue(); 
                document.getElementById('ticketForm').reset(); 
                closeAllModals(); 
            }
        } else {
            closeAllModals();
        }
    }

    document.querySelectorAll('.close-modal').forEach(oldBtn => {
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
        newBtn.addEventListener('click', safeCloseCheck);
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) safeCloseCheck(e);
    });

    // --- 2. PESTAÑAS DE PAGO (RECARGA) ---
    window.switchTab = function(tabName) {
        resetRechargeForm()
        document.querySelectorAll('.payment-info').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabName).style.display = 'block';
        event.currentTarget.classList.add('active');

        const methodInput = document.getElementById('paymentMethodInput');
        if (methodInput) methodInput.value = (tabName === 'pagoMovil') ? 'pago_movil' : 'transferencia';
    };

    const rechargeDateInput = document.querySelector('input[name="payment_date"]');
    
    if (rechargeDateInput) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 5);
        const minDateStr = minDate.toISOString().split('T')[0];

        rechargeDateInput.value = todayStr; 
        rechargeDateInput.max = todayStr;   
        rechargeDateInput.min = minDateStr; 
    }

    // --- 3. SISTEMA DE NOTIFICACIONES (Éxito/Error) ---
    const successActionModal = document.getElementById('successActionModal');
    let redirectOnClose = null;

    window.showSuccess = function(title, msg, redirectUrl = null) {
        redirectOnClose = redirectUrl; 
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.classList.remove('active');
            m.style.display = 'none'; 
        });
        document.body.style.overflow = ''; 
        document.getElementById('successTitle').textContent = title;
        document.getElementById('successMessage').textContent = msg;
        openModal(successActionModal);
    };

    window.closeSuccessModal = function() {
        if (redirectOnClose) { 
            if (redirectOnClose === true) {
                window.location.reload();
            } else {
                window.location.href = redirectOnClose;
            }
            return; 
        }
        if(successActionModal) {
            successActionModal.classList.remove('active');
            setTimeout(() => { successActionModal.style.display = 'none'; }, 300); 
        }
        document.body.style.overflow = '';
    };

    // --- 4. TICKET BUILDER: LÓGICA PRINCIPAL ---  
    // Datos de Animalitos
    const animals36 = [
        { num: '0', name: 'Delfín' }, { num: '00', name: 'Ballena' },
        { num: '1', name: 'Carnero' }, { num: '2', name: 'Toro' }, { num: '3', name: 'Ciempies' },
        { num: '4', name: 'Alacrán' }, { num: '5', name: 'León' }, { num: '6', name: 'Rana' },
        { num: '7', name: 'Perico' }, { num: '8', name: 'Ratón' }, { num: '9', name: 'Águila' },
        { num: '10', name: 'Tigre' }, { num: '11', name: 'Gato' }, { num: '12', name: 'Caballo' },
        { num: '13', name: 'Mono' }, { num: '14', name: 'Paloma' }, { num: '15', name: 'Zorro' },
        { num: '16', name: 'Oso' }, { num: '17', name: 'Pavo' }, { num: '18', name: 'Burro' },
        { num: '19', name: 'Chivo' }, { num: '20', name: 'Cochino' }, { num: '21', name: 'Gallo' },
        { num: '22', name: 'Camello' }, { num: '23', name: 'Zebra' }, { num: '24', name: 'Iguana' },
        { num: '25', name: 'Gallina' }, { num: '26', name: 'Vaca' }, { num: '27', name: 'Perro' },
        { num: '28', name: 'Zamuro' }, { num: '29', name: 'Elefante' }, { num: '30', name: 'Caimán' },
        { num: '31', name: 'Lapa' }, { num: '32', name: 'Ardilla' }, { num: '33', name: 'Pescado' },
        { num: '34', name: 'Venado' }, { num: '35', name: 'Jirafa' }, { num: '36', name: 'Culebra' }
    ];

    const animals75 = [...animals36, 
        { num: '37', name: 'Tortuga' }, { num: '38', name: 'Bufalo' }, { num: '39', name: 'Lechuza' },
        { num: '40', name: 'Avispa' }, { num: '41', name: 'Canguro' }, { num: '42', name: 'Tucán' },
        { num: '43', name: 'Mariposa' }, { num: '44', name: 'Chiguire' }, { num: '45', name: 'Garza' },
        { num: '46', name: 'Puma' }, { num: '47', name: 'Pavo Real' }, { num: '48', name: 'Puercoespin' },
        { num: '49', name: 'Pereza' }, { num: '50', name: 'Canario' }, { num: '51', name: 'Pelicano' },
        { num: '52', name: 'Pulpo' }, { num: '53', name: 'Caracol' }, { num: '54', name: 'Grillo' },
        { num: '55', name: 'Oso Hormiguero' }, { num: '56', name: 'Tiburón' }, { num: '57', name: 'Pato' },
        { num: '58', name: 'Hormiga' }, { num: '59', name: 'Pantera' }, { num: '60', name: 'Camaleón' },
        { num: '61', name: 'Panda' }, { num: '62', name: 'Cachicamo' }, { num: '63', name: 'Cangrejo' },
        { num: '64', name: 'Gavilán' }, { num: '65', name: 'Araña' }, { num: '66', name: 'Lobo' },
        { num: '67', name: 'Avestruz' }, { num: '68', name: 'Jaguar' }, { num: '69', name: 'Conejo' },
        { num: '70', name: 'Bisonte' }, { num: '71', name: 'Guacamaya' }, { num: '72', name: 'Gorila' },
        { num: '73', name: 'Hipopótamo' }, { num: '74', name: 'Turpial' }, { num: '75', name: 'Guacharo' }
    ];

    const animals99 = [...animals75,
        { num: '76', name: 'Rinoceronte' }, { num: '77', name: 'Pinguino' }, { num: '78', name: 'Antílope' },
        { num: '79', name: 'Calamar' }, { num: '80', name: 'Murciélago' }, { num: '81', name: 'Cuervo' },
        { num: '82', name: 'Cucaracha' }, { num: '83', name: 'Buho' }, { num: '84', name: 'Camarón' },
        { num: '85', name: 'Hamster' }, { num: '86', name: 'Buey' }, { num: '87', name: 'Cabra' },
        { num: '88', name: 'Erizo de Mar' }, { num: '89', name: 'Anguila' }, { num: '90', name: 'Hurón' },
        { num: '91', name: 'Morrocoy' }, { num: '92', name: 'Cisne' }, { num: '93', name: 'Gaviota' },
        { num: '94', name: 'Paujil' }, { num: '95', name: 'Escarabajo' }, { num: '96', name: 'Caballito de Mar' },
        { num: '97', name: 'Loro' }, { num: '98', name: 'Cocodrilo' }, { num: '99', name: 'Guacharito' }
    ];

    const lotteryConfig = {
        'Lotto Activo': animals36, 'La Granjita': animals36, 'Selva Plus': animals36, 'Lotto Rey': animals36,
        'Lotto Chaima': animals75, 'El Guácharo': animals75, 'Guacharo Activo': animals75, 'Cóndor': animals75,
        'Guacharito': animals99
    };

    function updateAnimalSelects(lotteryName) {
        const selects = [document.getElementById('animal1'), document.getElementById('animal2'), document.getElementById('animal3')];
        let selectedList = animals36;

        for (const [key, list] of Object.entries(lotteryConfig)) {
            if (lotteryName.includes(key)) { selectedList = list; break; }
        }

        selects.forEach((sel, index) => {
            if(!sel) return;
            const defaultText = index === 0 ? "1er Animal..." : (index === 1 ? "2do Animal..." : "3er Animal...");
            sel.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
            selectedList.forEach(animal => {
                const option = document.createElement('option');
                option.value = animal.num;
                option.text = `${animal.num} - ${animal.name}`;
                sel.appendChild(option);
            }); 
        });
    }

    // --- CONFIGURACIÓN DE HORARIOS ---   
    const times00 = [
        "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
    ];

    const times30 = [
        "08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM",
        "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM", "05:30 PM", "06:30 PM", "07:30 PM"
    ];

    const timesTriplesA = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
        "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"];

    const timesTriplesC = [
        "01:00 PM", "04:30 PM", "07:00 PM"];

    const timesTriplesCA = [
        "01:00 PM", "04:30 PM", "07:10 PM"];

    const timesTriplesT = [
        "01:15 PM", "04:45 PM", "10:00 PM"];

    const timesTriplesZ = [
        "12:45 PM", "4:45 PM", "7:05 PM"];
        
    const timesTriplesZA = [
        "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "7:00 PM"];

    const timeConfig = {
        'Lotto Activo': times00, 'La Granjita': times00, 'Selva Plus': times00, 
        'Lotto Chaima': times00, 'El Guácharo': times00, 'Cóndor': timesTriplesA,
        'Lotto Rey': times30, 'Guacharito': times30,

        'Zulia': timesTriplesZ, 'Caracas': timesTriplesC, 'Chance': timesTriplesA,
        'Táchira': timesTriplesT, 'Zamorano': timesTriplesZA, 'Caliente': timesTriplesCA
    };

    function updateTimeSelect(lotteryName) {
        const timeSelect = document.querySelector('select[name="draw_time"]');
        if (!timeSelect) return;

        timeSelect.innerHTML = '<option value="" disabled selected>Selecciona hora...</option>';
        const schedule = timeConfig[lotteryName] || times00;

        schedule.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.text = time;
            timeSelect.appendChild(option);
        });
    }

    function clearTicketInputs() {
        const inputTriple = document.getElementById('inputTriple');
        if (inputTriple) {
            inputTriple.value = '';
            inputTriple.maxLength = 3;     
            inputTriple.placeholder = "123"; 
        }
        document.getElementById('ticketAmount').value = '20';

        const typeTriple = document.getElementById('typeTriple');
        if(typeTriple) typeTriple.checked = true;

        const s1 = document.getElementById('animal1');
        const s2 = document.getElementById('animal2');
        const s3 = document.getElementById('animal3');
        
        if(s1) { 
            s1.value = ""; 
            s1.innerHTML = '<option value="" disabled selected>1er Animal...</option>'; 
        }
        if(s2) { 
            s2.value = ""; 
            s2.innerHTML = '<option value="" disabled selected>2do Animal...</option>'; 
        }
        if(s3) { 
            s3.value = ""; 
            s3.innerHTML = '<option value="" disabled selected>3er Animal...</option>'; 
        }

        document.querySelectorAll('input[name="letters"]').forEach(cb => cb.checked = false);
        
        const inputB = document.getElementById('letB');
        const labelB = document.querySelector('label[for="letB"]');
        if (inputB && labelB) {
            inputB.disabled = false;
            labelB.style.opacity = '1';
            labelB.style.pointerEvents = 'auto';
        }

        document.querySelectorAll('.lottery-chip').forEach(c => c.classList.remove('selected'));
        document.getElementById('selectedLotteryInput').value = '';

        const inputsToEnable = [
            inputTriple,
            document.getElementById('ticketAmount'),
            document.querySelector('select[name="draw_time"]'),
            document.querySelector('#ticketForm button[type="submit"]')
        ];
        
        inputsToEnable.forEach(el => {
            if(el) {
                el.disabled = false;
                if(el.tagName === 'BUTTON') el.style.opacity = '1';
            }
        });

        const optionsDiv = document.getElementById('triplesOptions');
        if(optionsDiv) optionsDiv.classList.remove('disabled-section');
    }

    window.toggleGameMode = function(mode) {
        clearTicketInputs();

        const isTriples = (mode === 'triples');
        document.getElementById('lotteriesTriples').style.display = isTriples ? 'grid' : 'none';
        document.getElementById('lotteriesAnimals').style.display = isTriples ? 'none' : 'grid';
        
        document.getElementById('triplesOptions').style.display = isTriples ? 'block' : 'none';
        document.getElementById('animalsOptions').style.display = isTriples ? 'none' : 'block';
        
        document.getElementById('groupTriple').style.display = isTriples ? 'flex' : 'none';
        document.getElementById('animalInputsContainer').style.display = isTriples ? 'none' : 'block';

        document.getElementById('playLabel').textContent = isTriples ? "Número" : "Elige tus Animalitos";

        const inputTriple = document.getElementById('inputTriple');
        const inputAnimal1 = document.getElementById('animal1');
        
        if(isTriples) {
            inputTriple.setAttribute('required', 'true');
            if(inputAnimal1) inputAnimal1.removeAttribute('required');
        } else {
            inputTriple.removeAttribute('required');
            if(inputAnimal1) inputAnimal1.setAttribute('required', 'true');
            document.getElementById('modeSingle').click();
        }
    };

    const betTypeInputs = document.querySelectorAll('input[name="bet_type"]');
    betTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            const inputTriple = document.getElementById('inputTriple');
            if (this.value === 'terminal') {
                inputTriple.maxLength = 2;
                inputTriple.placeholder = "00-99";
                inputTriple.value = inputTriple.value.slice(0, 2);
            } else {
                inputTriple.maxLength = 3;
                inputTriple.placeholder = "000-999";
            }
        });
    });

    window.selectLottery = function(element, lotteryName) {
        element.parentElement.querySelectorAll('.lottery-chip').forEach(chip => chip.classList.remove('selected'));
        element.classList.add('selected');
        document.getElementById('selectedLotteryInput').value = lotteryName;
        updateTimeSelect(lotteryName);

        const inputB = document.getElementById('letB');
        const labelB = document.querySelector('label[for="letB"]');

        if (lotteryName === 'Zamorano') {
            inputB.checked = false;      
            inputB.disabled = true;      
            labelB.style.opacity = '0.3';
            labelB.style.pointerEvents = 'none';
        } else {
            inputB.disabled = false;
            labelB.style.opacity = '1';
            labelB.style.pointerEvents = 'auto';
        }

        if (document.getElementById('modeAnimalitos').checked) {
            updateAnimalSelects(lotteryName);
            validateUniqueAnimals();
        }
    };

    // Validaciones de Animalitos
    window.toggleAnimalInputs = function(mode) {
        const isTripleta = (mode === 'tripleta');
        const s2 = document.getElementById('animal2');
        const s3 = document.getElementById('animal3');
        const s1 = document.getElementById('animal1');

        document.getElementById('groupAnimal2').style.display = isTripleta ? 'flex' : 'none';
        document.getElementById('groupAnimal3').style.display = isTripleta ? 'flex' : 'none';

        if (isTripleta) {
            if (s2.options.length <= 1) s2.innerHTML = s1.innerHTML.replace('1er Animal...', '2do Animal...');
            if (s3.options.length <= 1) s3.innerHTML = s1.innerHTML.replace('1er Animal...', '3er Animal...');
            
            s2.setAttribute('required', 'true');
            s3.setAttribute('required', 'true');
            validateUniqueAnimals();
        } else {
            s2.removeAttribute('required'); s2.value = "";
            s3.removeAttribute('required'); s3.value = "";
        }
    };

    function validateUniqueAnimals() {
        const s1 = document.getElementById('animal1');
        const s2 = document.getElementById('animal2');
        const s3 = document.getElementById('animal3');
        if(!s1 || !s2 || !s3) return;

        const v1 = s1.value;
        const v2 = s2.value;

        s2.disabled = !v1;
        s3.disabled = !(v1 && v2);

        [s2, s3].forEach(sel => {
            Array.from(sel.options).forEach(opt => {
                opt.disabled = (opt.value && (opt.value === v1 || (sel === s3 && opt.value === v2)));
            });
        });
        
        if(s2.value === v1) s2.value = "";
        if(s3.value === v1 || s3.value === v2) s3.value = "";
    }

    if(document.getElementById('animal1')) {
        document.getElementById('animal1').addEventListener('change', validateUniqueAnimals);
        document.getElementById('animal2').addEventListener('change', validateUniqueAnimals);
    }

    // --- 5. INICIALIZACIÓN ---
    const btnNewTicket = document.querySelector('a[href="#"][class="action-card"]'); 
    if(btnNewTicket) {
        btnNewTicket.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('ticketForm').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('ticketDate').value = today;
            document.getElementById('modeTriples').checked = true;
            toggleGameMode('triples');
            openModal(document.getElementById('ticketModal'));
        });
    }

    // --- 6. PROCESAMIENTO DE MENSAJES DE SESIÓN ---
    const serverMsgDiv = document.getElementById('serverMessage');
    if (serverMsgDiv) {
        const msgText = serverMsgDiv.getAttribute('data-message');
        const msgType = serverMsgDiv.getAttribute('data-type');
        const iconContainer = document.querySelector('.success-animation');
        const titleText = document.getElementById('successTitle');
        
        if (msgType === 'error' || msgType === 'warning') {
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--alert);"></i>';
            titleText.innerText = "Atención";
            titleText.style.color = "var(--alert)";
        } else {
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
            titleText.innerText = "¡Listo!";
            titleText.style.color = "var(--primary)";
        }
        showSuccess(titleText.innerText, msgText);
    }

    // --- 7. LÓGICA DE CARRITO DE COMPRAS (COLA DE TICKETS) ---
    const btnProcessQueue = document.getElementById('btnProcessQueue');
    const queueContainer = document.getElementById('queueContainer');
    const queueTableBody = document.getElementById('queueTableBody');

    const oldBtnAddToQueue = document.getElementById('btnAddToQueue');
    
    if (oldBtnAddToQueue) {
        const btnAddToQueue = oldBtnAddToQueue.cloneNode(true);
        oldBtnAddToQueue.parentNode.replaceChild(btnAddToQueue, oldBtnAddToQueue);
        btnAddToQueue.addEventListener('click', function() {

            const amountInput = document.getElementById('ticketAmount');
            const amount = parseFloat(amountInput.value);
            if (isNaN(amount) || amount < 20) {
                return alert("⚠️ El monto mínimo por ticket es de Bs. 20,00");
            }
            
            const currentQueueTotal = ticketQueue.reduce((sum, item) => sum + item.totalCost, 0);
            const balanceText = document.querySelector('.balance-amount').innerText;
            const cleanBalance = parseFloat(balanceText.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

            const isTriples = document.getElementById('modeTriples').checked;
            let multiplier = 1;
            let lettersCount = 1;
            let playDetails = {};

            if (isTriples) {
                const num = document.getElementById('inputTriple').value;
                const betType = document.querySelector('input[name="bet_type"]:checked').value;
                const letters = Array.from(document.querySelectorAll('input[name="letters"]:checked')).map(e => e.value);
                
                if (betType === 'terminal' && num.length !== 2) return alert("⚠️ Terminal debe ser de 2 dígitos.");
                if (betType !== 'terminal' && num.length !== 3) return alert("⚠️ Número debe ser de 3 dígitos.");
                if (letters.length === 0) return alert("⚠️ Selecciona al menos una letra.");

                if (betType === 'permuta') {
                    const unique = new Set(num.split('')).size;
                    multiplier = (unique === 3) ? 6 : (unique === 2 ? 3 : 1);
                }
                lettersCount = letters.length;
                
                playDetails = {
                    type: 'triples',
                    value: num,
                    desc: `${betType.toUpperCase()} ${num} (${letters.join(',')})`,
                    bet_type: betType,
                    letters: letters
                };
            } else {
                const isTripleta = document.getElementById('modeTripleta').checked;
                const s1 = document.getElementById('animal1');
                
                if (!s1.value) return alert("⚠️ Selecciona al menos el primer animal.");
                
                if (isTripleta) {
                    const s2 = document.getElementById('animal2');
                    const s3 = document.getElementById('animal3');
                    if (!s2.value || !s3.value) return alert("⚠️ Para tripleta necesitas 3 animales.");
                    
                    playDetails = {
                        type: 'animalitos',
                        value: s1.options[s1.selectedIndex].text,
                        extras: s2.options[s2.selectedIndex].text + ", " + s3.options[s3.selectedIndex].text,
                        desc: `TRIPLETA: ${s1.value}-${s2.value}-${s3.value}`,
                        bet_type: 'tripleta'
                    };
                } else {
                    playDetails = {
                        type: 'animalitos',
                        value: s1.options[s1.selectedIndex].text,
                        desc: s1.options[s1.selectedIndex].text,
                        bet_type: 'single',
                        extras: ""
                    };
                }
            }

            const ticketCost = amount * multiplier * lettersCount;

            if ((currentQueueTotal + ticketCost) > cleanBalance) {
                return alert(`⚠️ Saldo insuficiente.\nSaldo: Bs. ${cleanBalance}\nEn Cola: Bs. ${currentQueueTotal}\nEsta Jugada: Bs. ${ticketCost}`);
            }

            const lottery = document.getElementById('selectedLotteryInput').value;
            const timeSelect = document.querySelector('select[name="draw_time"]').value;
            if (!lottery || !timeSelect) return alert("⚠️ Faltan datos de Lotería u Hora.");
 
            const now = new Date();
            const [timePart, modifier] = timeSelect.split(' ');
            let [hours, minutes] = timePart.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            const drawDate = new Date();
            drawDate.setHours(hours, minutes, 0, 0);
            if (now >= new Date(drawDate.getTime() - 5 * 60000)) {
                return alert(`⏳ El sorteo de las ${timeSelect} ya cerró.`);
            }

            const ticketItem = {
                lottery: lottery,
                draw_time: timeSelect,
                amount: amount,
                totalCost: ticketCost,
                details: playDetails,
                multiplier: multiplier,
                lettersCount: lettersCount
            };

            ticketQueue.push(ticketItem);
            renderQueue();
            showMiniToast("¡Ticket agregado a la cola!");
            if (typeof partialClearInputs === 'function') {
                partialClearInputs(isTriples);
            }
        });
    }

    function renderQueue() {
        queueTableBody.innerHTML = '';
        let grandTotal = 0;

        ticketQueue.forEach((item, index) => {
            const row = document.createElement('tr');
            grandTotal += item.totalCost;

            row.innerHTML = `
                <td class="queue-info">
                    <span class="q-lottery">${item.lottery} <span style="color:#999; font-weight:400;">@ ${item.draw_time}</span></span>
                    <span class="q-details">${item.details.desc}</span>
                </td>
                <td style="text-align: right;">
                    <div class="q-amount">Bs. ${item.totalCost.toFixed(2)}</div>
                </td>
                <td style="width: 30px; text-align: center;">
                    <button class="btn-remove-item" onclick="removeFromQueue(${index})">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            queueTableBody.appendChild(row);
        });

        document.getElementById('queueCountBadge').innerText = ticketQueue.length;
        document.getElementById('queueTotalAmount').innerText = 'Bs. ' + grandTotal.toFixed(2);
        
        const hasItems = ticketQueue.length > 0;
        queueContainer.style.display = hasItems ? 'block' : 'none';
        btnProcessQueue.style.display = hasItems ? 'block' : 'none';
        
    }

    // C. ELIMINAR ITEM (Global para poder llamarlo desde el HTML)
    window.removeFromQueue = function(index) {
        ticketQueue.splice(index, 1);
        renderQueue();
    };

    // D. LIMPIEZA PARCIAL (Solo limpia la jugada, deja lotería/hora)
    function partialClearInputs(isTriples) {
        if (isTriples) {
            const inputTriple = document.getElementById('inputTriple');
            inputTriple.value = '';
            if (window.innerWidth > 768) {
                inputTriple.focus();
            }
        } else {
            const s1 = document.getElementById('animal1');
            const s2 = document.getElementById('animal2');
            const s3 = document.getElementById('animal3');
            
            s1.value = "";
            if (s2) { s2.value = ""; s2.innerHTML = '<option value="" disabled selected>2do Animal...</option>'; }
            if (s3) { s3.value = ""; s3.innerHTML = '<option value="" disabled selected>3er Animal...</option>'; }

            validateUniqueAnimals();
        }
    }

    // E. PROCESAR COLA (Abrir Confirmación)
    if (btnProcessQueue) {
        btnProcessQueue.addEventListener('click', function() {
            const modalTicket = document.getElementById('ticketModal');
            const modalConfirm = document.getElementById('ticketConfirmModal');
            
            modalTicket.style.display = 'none';
            modalConfirm.style.display = 'flex';
            setTimeout(() => { modalConfirm.classList.add('active'); }, 10);

            let summaryHtml = '<ul style="list-style: none; padding: 0;">';
            let finalTotal = 0;

            ticketQueue.forEach(item => {
                finalTotal += item.totalCost;
                summaryHtml += `
                    <li style="border-bottom: 1px dashed #eee; padding: 8px 0; display: flex; justify-content: space-between;">
                        <div>
                            <strong>${item.lottery}</strong> (${item.draw_time})<br>
                            <span style="color: var(--primary); font-size: 0.9rem;">${item.details.desc}</span>
                        </div>
                        <div style="font-weight: bold;">Bs. ${item.totalCost}</div>
                    </li>
                `;
            });
            summaryHtml += '</ul>';
            
            summaryHtml += `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #ddd; display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem;">
                    <span>Total Tickets: <strong>${ticketQueue.length}</strong></span>
                    <span style="color: var(--primary); font-size: 1.3rem;"><strong>Bs. ${finalTotal.toFixed(2)}</strong></span>
                </div>
            `;

            document.getElementById('confirmationSummary').innerHTML = summaryHtml;
        });
    }

    // F. CONFIRMACIÓN FINAL (Aquí enviaremos al Backend en el siguiente paso)
    const btnRealConfirm = document.getElementById('btnRealConfirm');  
    if (btnRealConfirm) {
        const newBtn = btnRealConfirm.cloneNode(true);
        btnRealConfirm.parentNode.replaceChild(newBtn, btnRealConfirm);

        newBtn.addEventListener('click', function() {
            const self = this;
            
            if (ticketQueue.length === 0) return;

            self.disabled = true;
            self.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            fetch('/api/create-ticket/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
                body: JSON.stringify({ tickets: ticketQueue })
            })
            .then(response => response.json())
            .then(data => {
                self.disabled = false;
                self.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar';

                const modalConfirm = document.getElementById('ticketConfirmModal');
                if(modalConfirm) {
                    modalConfirm.classList.remove('active');
                    modalConfirm.style.display = 'none';
                }

                if (data.success) {
                    ticketQueue = []; 
                    renderQueue();    
                    document.getElementById('ticketForm').reset(); 
                    
                    showSuccess(
                        '¡Jugada Procesada!', 
                        data.message, 
                        true 
                    );
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                self.disabled = false;
                self.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar';
                alert('Error de conexión.');
            });
        });
    }

    // Botón CORREGIR (Volver atrás en el modal)
    const btnCancel = document.getElementById('btnCancelConfirm');
    if(btnCancel) {
        btnCancel.addEventListener('click', function() {
            const modalConfirm = document.getElementById('ticketConfirmModal');
            const modalTicket = document.getElementById('ticketModal');
            if (modalConfirm) {
                modalConfirm.classList.remove('active');
                modalConfirm.style.display = 'none';
            }
            if (modalTicket) {
                openModal(modalTicket); 
            }
        });
    }

    // --- D. LOGICA RECARGA ---
    const rechargeForm = document.getElementById('rechargeForm');
    if (rechargeForm) {
        const newRechargeForm = rechargeForm.cloneNode(true);
        rechargeForm.parentNode.replaceChild(newRechargeForm, rechargeForm);

        newRechargeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const refValue = this.querySelector('input[name="reference"]').value;
            if (refValue.length !== 4 && refValue.length !== 6) {
                alert("⚠️ La referencia bancaria debe tener exactamente 4 o 6 dígitos.");
                return; 
            }
            
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

            const formData = new FormData(this);
            const payload = {
                reference: formData.get('reference'),
                amount: formData.get('amount'),
                payment_date: formData.get('payment_date'),
                payment_method: document.getElementById('paymentMethodInput').value
            };
            
            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            fetch('/api/recharge/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                btn.disabled = false;
                btn.innerHTML = originalText;

                if (data.success) {
                    const modalRecharge = document.getElementById('rechargeModal');
                    if(modalRecharge) {
                        modalRecharge.classList.remove('active');
                        modalRecharge.style.display = 'none';
                    }

                    showSuccess('¡Pago Reportado!', 'Tu pago está en revisión. El saldo se acreditará en breve.', true);
                    newRechargeForm.reset();
                } else {
                    alert('Error al reportar pago: ' + data.error);
                }
            })
            .catch(error => {
                console.error(error);
                btn.disabled = false;
                btn.innerHTML = originalText;
                alert('Error de conexión.');
            });
        });
    }

    const rechargeAmountInput = document.querySelector('#rechargeForm input[name="amount"]');
    if (rechargeAmountInput) {
        rechargeAmountInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9.]/g, '');

            if ((this.value.match(/\./g) || []).length > 1) {
                this.value = this.value.slice(0, -1);
            }
        });
    }
    const rechargeRefInput = document.querySelector('#rechargeForm input[name="reference"]');
    if (rechargeRefInput) {
        rechargeRefInput.setAttribute('type', 'tel'); 
        rechargeRefInput.setAttribute('pattern', '[0-9]*');
        rechargeRefInput.setAttribute('maxlength', '6');
        rechargeRefInput.setAttribute('inputmode', 'numeric');
        rechargeRefInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    function checkSession() {
        if (document.hidden) return;
        if (isPasswordChanged) return;
        fetch('/api/check-session/')
            .then(response => response.json())
            .then(data => {
                if (isPasswordChanged) return;
                if (!data.is_active) window.location.reload();
            })
            .catch(e => console.error(e));
    }

    sessionTimer = setInterval(checkSession, 60000);
    document.addEventListener("visibilitychange", function() {
        if (!document.hidden) checkSession();
    });

    // --- FILTROS DE HISTORIAL AVANZADOS (FECHA + TIPO + LOTERÍA) ---
    const dateFilter = document.getElementById('dateFilter');
    const gameTypeFilter = document.getElementById('gameTypeFilter');
    const ticketFilter = document.getElementById('ticketFilter');

    const lists = {
        'triples': ['Zulia', 'Caracas', 'Táchira', 'Chance', 'Zamorano', 'Caliente'],
        'animalitos': ['Lotto Activo', 'La Granjita', 'Selva Plus', 'Guacharito', 'El Guácharo', 'Lotto Chaima', 'Lotto Rey', 'Cóndor']
    };

    if (dateFilter) {
        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = new Date();
        const minDate = new Date();
        minDate.setDate(today.getDate() - 3);
        dateFilter.max = getLocalDateStr(today);
        dateFilter.min = getLocalDateStr(minDate);
        dateFilter.value = getLocalDateStr(today);
    }

    function updateLotteryOptions() {
        if (!ticketFilter || !gameTypeFilter) return;
        
        const type = gameTypeFilter.value;
        const options = lists[type] || [];

        ticketFilter.innerHTML = '<option value="all">Ver Todas</option>';
        options.forEach(lotto => {
            const opt = document.createElement('option');
            opt.value = lotto; 
            opt.innerText = lotto;
            ticketFilter.appendChild(opt);
        });

        filterTickets();
    }

    const statusFilter = document.getElementById('statusFilter');
    function filterTickets() {
        const dateValue = dateFilter ? dateFilter.value : '';
        const typeValue = gameTypeFilter ? gameTypeFilter.value : 'triples';
        const lottoValue = ticketFilter ? ticketFilter.value.toLowerCase() : 'all';
        const statusValue = statusFilter ? statusFilter.value : 'all';
        
        const tickets = document.querySelectorAll('.ticket-compact');
        const noMsg = document.getElementById('noResultsMessage');
        
        if (tickets.length === 0) return;

        let visibleCount = 0;
        tickets.forEach(ticket => {
            const tDate = ticket.getAttribute('data-date');
            const tType = (ticket.getAttribute('data-gametype') || '').toLowerCase(); 
            const tLotto = ticket.getAttribute('data-lottery').toLowerCase();
            const tStatus = ticket.getAttribute('data-status');

            const matchDate = (dateValue === '') || (tDate === dateValue);
            const matchType = (tType === typeValue);
            const matchLotto = (lottoValue === 'all') || tLotto.includes(lottoValue);
            const matchStatus = (statusValue === 'all') || (tStatus === statusValue);           

            const isVisible = (matchDate && matchType && matchLotto && matchStatus);
            
            ticket.style.display = isVisible ? 'flex' : 'none';
            
            if (isVisible) visibleCount++;
        });

        if (noMsg) {
            noMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }

    if (statusFilter) statusFilter.addEventListener('change', filterTickets);
    if (gameTypeFilter) {
        gameTypeFilter.addEventListener('change', updateLotteryOptions);
        updateLotteryOptions(); 
    }
    if (ticketFilter) ticketFilter.addEventListener('change', filterTickets);
    if (dateFilter) dateFilter.addEventListener('change', filterTickets);

    // SECCIÓN PAGINACIÓN Modal de historial
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    const scrollArea = document.getElementById('fullHistoryScrollArea');
    const tableBody = document.getElementById('fullHistoryTableBody');
    const loader = document.getElementById('historyLoader');

    function loadHistoryPage() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        if(loader) loader.style.display = 'block';

        fetch(`/api/history/?page=${currentPage}`)
            .then(res => res.json())
            .then(data => {
                const movements = data.movements;
                hasMore = data.has_next;

                if (currentPage === 1) {
                    tableBody.innerHTML = '';
                }

                if (movements.length === 0 && currentPage === 1) {
                    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay movimientos.</td></tr>';
                }

                movements.forEach(mov => {
                    const uniqueRowId = `hist-row-${mov.type}-${mov.id}`;
                    if (document.getElementById(uniqueRowId)) {
                        return; 
                    }

                    let statusClass = 'status-pending';
                    let statusText = 'Pendiente';
                    
                    if (mov.status === 'ganador' || mov.status === 'aprobado') {
                        statusClass = 'status-won';
                        statusText = mov.status === 'aprobado' ? 'Aprobado' : 'Ganador';
                    } else if (mov.status === 'perdedor' || mov.status === 'rechazado') {
                        statusClass = 'status-lost';
                        statusText = mov.status === 'rechazado' ? 'Rechazado' : 'No Ganador';
                    }

                    const row = document.createElement('tr');
                    row.id = uniqueRowId; 

                    let idHtml = '';
                    if (mov.type === 'ticket') {
                        idHtml = `<span class="ticket-id">#FEL-${mov.id}</span>`;
                    } else {
                        idHtml = `<span class="ticket-id" style="background:#e3fcef; color:#0d5e3d;">REF-${mov.ref.slice(0,6)}</span>`;
                    }

                    const amountStyle = mov.type === 'ticket' ? 'color:var(--alert);' : 'color:#27ae60;';
                    const amountSign = mov.type === 'ticket' ? '-' : '+';

                    row.innerHTML = `
                        <td>${mov.date}</td>
                        <td>${idHtml}</td>
                        <td style="font-size:0.85rem;">${mov.desc}</td>
                        <td style="${amountStyle} font-weight:bold;">${amountSign} Bs. ${mov.amount}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    `;
                    tableBody.appendChild(row);
                });

                currentPage++;
                isLoading = false;
                if(loader) loader.style.display = 'none';
                if (hasMore && scrollArea.scrollHeight <= scrollArea.clientHeight) {
                    loadHistoryPage();
                }
            })
            .catch(err => {
                console.error(err);
                isLoading = false;
                if(loader) loader.style.display = 'none';
            });
    }

    const btnHistory = document.getElementById('btnViewAllHistory');
    if (btnHistory) {
        btnHistory.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('fullHistoryModal');
            if (modal) {
                document.getElementById('fullHistoryTableBody').innerHTML = '';
                const scrollArea = document.getElementById('fullHistoryScrollArea');
                if(scrollArea) scrollArea.scrollTop = 0;

                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);              
                currentPage = 1;
                hasMore = true;
                isLoading = false;             
                loadHistoryPage();
            }
        });
    }

    if (scrollArea) {
        scrollArea.addEventListener('scroll', function() {
            if (scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 50) {
                loadHistoryPage();
            }
        });
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (sessionTimer) clearInterval(sessionTimer);
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            const newPass = this.querySelector('input[name="new_password"]').value;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

            const formData = new FormData(this);
            formData.append('is_ajax', 'true'); 

            fetch(window.location.href, { 
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => {
                if (response.ok) {
                    return { success: true }; 
                }
                throw new Error('Error en la actualización');
            })
            .then(data => {
                btn.disabled = false;
                btn.innerHTML = originalText;

                if (newPass && newPass.trim() !== "") {
                    isPasswordChanged = true;
                    const logoutBtn = document.querySelector('#logoutModal a.btn-primary');
                    const logoutUrl = logoutBtn ? logoutBtn.getAttribute('href') : '/logout/';
                    showSuccess(
                        '¡Seguridad Actualizada!', 
                        'Tu contraseña ha sido cambiada. Debes iniciar sesión nuevamente.', 
                        logoutUrl 
                    );
                } else {
                    showSuccess('Datos Actualizados', 'Tu perfil se ha guardado correctamente.');
                    const passInput = profileForm.querySelector('input[name="new_password"]');
                    if(passInput) passInput.value = "";
                }
            })
            .catch(error => {
                console.error(error);
                btn.disabled = false;
                btn.innerHTML = originalText;
                alert('Ocurrió un error al guardar los cambios.');
            });
        });
    }

    // --- 9. PROTECCIÓN CONTRA RECARGA ACCIDENTAL ---
    window.addEventListener('beforeunload', function (e) {
        if (ticketQueue.length > 0) {
            e.preventDefault(); 
            e.returnValue = ''; 
        }
    });
});