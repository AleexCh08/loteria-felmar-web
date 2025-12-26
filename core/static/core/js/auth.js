
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#id_password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const registerForm = document.getElementById('registerForm');   
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const ageInput = document.getElementById('id_age');
            const pass1 = document.getElementById('reg_password').value;
            const pass2 = document.getElementById('reg_confirm').value;
            
            const birthInput = document.getElementById('id_birthdate');
            const birthDate = new Date(birthInput.value);
            const today = new Date();
            
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 18 || isNaN(age)) { 
                e.preventDefault();
                alert('🚫 Debes tener al menos 18 años cumplidos para registrarte.');
                birthInput.focus();
                return;
            }

            if (pass1 !== pass2) {
                e.preventDefault();
                alert('⚠️ Las contraseñas no coinciden. Por favor verifícalas.');
            }
        });
    }

    const modal = document.getElementById('privacyModal');
    const privacyLink = document.getElementById('linkPrivacy'); 
    const closeModalBtn = document.querySelector('.close-modal');
    const acceptModalBtn = document.getElementById('acceptModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const termsCheckbox = document.getElementById('terms');

    function openModal(e) {
        if(e) e.preventDefault(); 
        if(modal) {
            modal.style.display = 'flex';
            setTimeout(() => { modal.classList.add('active'); }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if(modal) {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 300);
            document.body.style.overflow = '';
        }
    }

    if (privacyLink) {
        console.log("Enlace de privacidad encontrado. Activando evento.");
        privacyLink.addEventListener('click', openModal);
    } else {
        console.log("No se encontró el enlace con id='linkPrivacy'");
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    if (acceptModalBtn) {
        acceptModalBtn.addEventListener('click', function() {
            if(termsCheckbox) termsCheckbox.checked = true;
            closeModal();
        });
    }

    window.showSuccessModal = function() {
        const successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.style.display = 'flex';
            setTimeout(() => { successModal.classList.add('active'); }, 10);
            document.body.style.overflow = 'hidden';
        }
    }

    const successFlag = document.getElementById('registration-success-flag'); 
    if (successFlag) {
        if (typeof showSuccessModal === 'function') {
            showSuccessModal();
        }
    }

    const ciInput = document.getElementById('id_ci');
    
    if (ciInput) {
        const errorMsg = document.createElement('div');
        errorMsg.style.color = '#dc3545';
        errorMsg.style.fontSize = '0.85rem';
        errorMsg.style.marginTop = '5px';
        errorMsg.style.display = 'none';
        errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Ingresa solo números (sin V, puntos o guiones).';
        
        ciInput.parentNode.appendChild(errorMsg);

        ciInput.addEventListener('input', function(e) {
            const value = e.target.value;
            if (/[^0-9]/.test(value)) {
                ciInput.style.borderColor = '#dc3545';
                errorMsg.style.display = 'block';
            } else {
                ciInput.style.borderColor = '#eee'; 
                errorMsg.style.display = 'none';
            }
        });
    }

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
});