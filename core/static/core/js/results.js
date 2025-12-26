document.addEventListener('DOMContentLoaded', function() {

    const scrollTopBtn = document.getElementById('scrollTopBtn');

    if (scrollTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) { 
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });

        scrollTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    const dateInput = document.getElementById('dateFilter');
    if (dateInput) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - 3);
        const minDateStr = pastDate.toISOString().split('T')[0];

        dateInput.max = todayStr;
        dateInput.min = minDateStr;

        dateInput.addEventListener('change', function() {
            window.location.href = `?date=${this.value}`;
        });
    }

    const searchInput = document.getElementById('searchFilter');
    const typeRadios = document.querySelectorAll('input[name="resultType"]');
    
    const selectTriples = document.getElementById('selectTriples');
    const selectAnimals = document.getElementById('selectAnimals');
    
    const cards = document.querySelectorAll('.result-card');
    const noResultsMsg = document.getElementById('noResults');

    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    function applyFilters() {
        const selectedType = document.querySelector('input[name="resultType"]:checked').value; 
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        
        let specificLottery = 'all';
        if (selectedType === 'triple' && selectTriples) {
            specificLottery = selectTriples.value.toLowerCase();
        } else if (selectedType === 'animal' && selectAnimals) {
            specificLottery = selectAnimals.value.toLowerCase();
        }

        let visibleCount = 0;

        cards.forEach(card => {
            const dataName = card.getAttribute('data-name'); 
            const isAnimalCard = card.querySelector('.animal-result') !== null;
            
            let typeMatch = false;
            if (selectedType === 'triple' && !isAnimalCard) typeMatch = true;
            if (selectedType === 'animal' && isAnimalCard) typeMatch = true;

            let dropdownMatch = true;
            if (specificLottery !== 'all') {
                dropdownMatch = dataName.includes(specificLottery);
            }

            let searchMatch = true;
            if (searchText !== '') {
                searchMatch = dataName.includes(searchText);
            }

            if (typeMatch && dropdownMatch && searchMatch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResultsMsg) {
            noResultsMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }

    function toggleDropdowns() {
        const selectedType = document.querySelector('input[name="resultType"]:checked').value;
        
        if (selectedType === 'triple') {
            if(selectTriples) selectTriples.style.display = 'block';
            if(selectAnimals) selectAnimals.style.display = 'none';
            if(selectAnimals) selectAnimals.value = 'all';
        } else {
            if(selectTriples) selectTriples.style.display = 'none';
            if(selectAnimals) selectAnimals.style.display = 'block';
            if(selectTriples) selectTriples.value = 'all';
        }
        applyFilters(); 
    }
 
    typeRadios.forEach(radio => {
        radio.addEventListener('change', toggleDropdowns);
    });

    if(selectTriples) selectTriples.addEventListener('change', applyFilters);
    if(selectAnimals) selectAnimals.addEventListener('change', applyFilters);
    if(searchInput) searchInput.addEventListener('input', applyFilters);

    const btnRefresh = document.getElementById('btnRefresh');
    if(btnRefresh) {
        btnRefresh.addEventListener('click', function() {
            this.querySelector('i').classList.add('fa-spin');
            setTimeout(() => {
                this.querySelector('i').classList.remove('fa-spin');
                location.reload(); 
            }, 500);
        });
    }

    toggleDropdowns(); 
});