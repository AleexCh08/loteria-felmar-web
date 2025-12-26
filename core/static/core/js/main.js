document.addEventListener('DOMContentLoaded', function() {  
    // BOTÓN FLOTANTE AL LLEGAR A RESULTADOS
    const mapBtn = document.querySelector('.floating-map-btn');
    const footer = document.querySelector('.results-preview');

    if (mapBtn && footer) {
        window.addEventListener('scroll', function() {
            const footerPosition = footer.getBoundingClientRect().top;
            const screenPosition = window.innerHeight;

            if (footerPosition < screenPosition) {
                mapBtn.classList.add('visible');
            } else {
                mapBtn.classList.remove('visible');
            }
        });
    }
});