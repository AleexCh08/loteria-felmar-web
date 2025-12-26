document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA 1: CARRUSEL HERO (Texto Principal) ---
    const heroSlides = document.querySelectorAll('.hero-slide');
    if (heroSlides.length > 0) {
        let currentHeroIndex = 0;
        const heroTime = 3000; // 3 segundos

        setInterval(() => {
            heroSlides[currentHeroIndex].classList.remove('active');
            currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
            heroSlides[currentHeroIndex].classList.add('active');
        }, heroTime);
    }

    // --- LÓGICA 2: CARRUSEL DE RESULTADOS ---
    let resultIndex = 0;
    const resultSlides = document.getElementsByClassName("results-slide");
    const dots = document.getElementsByClassName("dot");
    const resultsTime = 5000; // 5 segundos
    let resultsTimer; // Variable para guardar el temporizador

    // Función principal para mostrar un slide específico
    window.showResultSlide = function(n) {
        if (resultSlides.length === 0) return;

        // Resetear índice si nos pasamos
        if (n >= resultSlides.length) { resultIndex = 0; }
        if (n < 0) { resultIndex = resultSlides.length - 1; }

        // Ocultar todos los slides y quitar estilo a los puntos
        for (let i = 0; i < resultSlides.length; i++) {
            resultSlides[i].style.display = "none";
            resultSlides[i].classList.remove("active-result");
            dots[i].className = dots[i].className.replace(" active-dot", "");
        }

        // Mostrar el slide actual y activar el punto
        resultSlides[resultIndex].style.display = "block";
        resultSlides[resultIndex].classList.add("active-result");
        if(dots.length > 0) {
            dots[resultIndex].className += " active-dot";
        }
    };

    // Función para avanzar manual (Flechas)
    window.moveResults = function(n) {
        clearInterval(resultsTimer); // Detener el automático al hacer clic
        resultIndex += n;
        showResultSlide(resultIndex);
        startResultsTimer(); // Reiniciar el automático
    };

    // Función para ir a un slide específico (Puntos)
    window.currentResultSlide = function(n) {
        clearInterval(resultsTimer);
        resultIndex = n;
        showResultSlide(resultIndex);
        startResultsTimer();
    };

    // Función para iniciar el temporizador automático
    function startResultsTimer() {
        resultsTimer = setInterval(() => {
            resultIndex++;
            showResultSlide(resultIndex);
        }, resultsTime);
    }

    // INICIALIZACIÓN
    if (resultSlides.length > 0) {
        showResultSlide(resultIndex); // Mostrar el primero
        startResultsTimer(); // Arrancar el reloj
    }
});