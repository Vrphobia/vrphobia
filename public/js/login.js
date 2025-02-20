document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorAlert = document.getElementById('errorAlert');
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Handle login
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';
        errorAlert.style.display = 'none';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user data
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('token', data.token);
                storage.setItem('user', JSON.stringify(data.user));

                // Show success message
                errorAlert.className = 'alert alert-success';
                errorAlert.textContent = 'Giriş başarılı! Yönlendiriliyorsunuz...';
                errorAlert.style.display = 'block';

                // Redirect based on role
                setTimeout(() => {
                    switch (data.user.role) {
                        case 'admin':
                            window.location.href = '/admin/dashboard';
                            break;
                        case 'therapist':
                            window.location.href = '/therapist/dashboard';
                            break;
                        case 'client':
                            window.location.href = '/client/dashboard';
                            break;
                        default:
                            window.location.href = '/dashboard';
                    }
                }, 1000);
            } else {
                // Show error message
                errorAlert.className = 'alert alert-danger';
                errorAlert.textContent = data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
                errorAlert.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorAlert.className = 'alert alert-danger';
            errorAlert.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            errorAlert.style.display = 'block';
        } finally {
            // Restore button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
