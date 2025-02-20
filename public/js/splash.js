document.addEventListener('DOMContentLoaded', function() {
    // Show splash screen
    const splash = document.querySelector('.splash-screen');
    
    // Hide splash screen after 0.8 seconds (reduced from 1 second)
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 300); // Reduced from 500ms to 300ms
    }, 800); // Reduced from 1000ms to 800ms

    // Add page transition element
    const pageTransition = document.createElement('div');
    pageTransition.className = 'page-transition';
    pageTransition.innerHTML = '<img src="assets/images/logo.png" alt="VR PHOBIA Logo" class="logo">';
    document.body.appendChild(pageTransition);

    // Handle login button transition only
    const loginButton = document.querySelector('a[href="login.html"]');
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.href;

            // Show transition
            pageTransition.classList.add('active');

            // Navigate after shorter animation
            setTimeout(() => {
                window.location.href = href;
            }, 300); // Reduced from 500ms to 300ms
        });
    }
});
