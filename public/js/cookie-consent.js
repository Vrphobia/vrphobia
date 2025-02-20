document.addEventListener('DOMContentLoaded', function() {
    const cookieConsent = document.createElement('div');
    cookieConsent.className = 'cookie-consent';
    cookieConsent.innerHTML = `
        <div class="cookie-content">
            <i class="fas fa-cookie-bite cookie-icon"></i>
            <p>Bu web sitesi, size en iyi deneyimi sunmak için çerezleri kullanmaktadır.</p>
            <div class="cookie-buttons">
                <button class="btn btn-light btn-sm me-2" id="cookieSettings">
                    <i class="fas fa-cog me-2"></i>Çerez Ayarları
                </button>
                <button class="btn btn-primary btn-sm" id="acceptCookies">
                    <i class="fas fa-check me-2"></i>Kabul Et
                </button>
            </div>
        </div>
    `;

    // Only show if consent not already given
    if (!localStorage.getItem('cookieConsent')) {
        document.body.appendChild(cookieConsent);
        
        // Animate in
        setTimeout(() => {
            cookieConsent.style.transform = 'translateY(0)';
            cookieConsent.style.opacity = '1';
        }, 1000);
    }

    // Handle accept button
    document.getElementById('acceptCookies')?.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'true');
        cookieConsent.style.transform = 'translateY(100%)';
        cookieConsent.style.opacity = '0';
        setTimeout(() => cookieConsent.remove(), 500);
    });

    // Handle settings button
    document.getElementById('cookieSettings')?.addEventListener('click', () => {
        // Show cookie settings modal
        const modal = new bootstrap.Modal(document.getElementById('cookieSettingsModal'));
        modal.show();
    });
});
