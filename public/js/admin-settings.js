// Token kontrolü
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// API istekleri için headers
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupFormListeners();
});

// Ayarları yükle
async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings', { headers });
        if (!response.ok) throw new Error('Ayarlar yüklenemedi');
        
        const settings = await response.json();
        
        // Genel ayarlar
        document.getElementById('siteName').value = settings.general.siteName;
        document.getElementById('siteDescription').value = settings.general.siteDescription;
        document.getElementById('contactEmail').value = settings.general.contactEmail;
        document.getElementById('timezone').value = settings.general.timezone;

        // E-posta ayarları
        document.getElementById('smtpHost').value = settings.email.smtpHost;
        document.getElementById('smtpPort').value = settings.email.smtpPort;
        document.getElementById('smtpUser').value = settings.email.smtpUser;
        document.getElementById('emailFrom').value = settings.email.emailFrom;

        // Randevu ayarları
        document.getElementById('appointmentDuration').value = settings.appointments.defaultDuration;
        document.getElementById('minNoticeTime').value = settings.appointments.minNoticeTime;
        document.getElementById('workingHoursStart').value = settings.appointments.workingHours.start;
        document.getElementById('workingHoursEnd').value = settings.appointments.workingHours.end;
        document.getElementById('allowWeekends').checked = settings.appointments.allowWeekends;

        // Güvenlik ayarları
        document.getElementById('sessionTimeout').value = settings.security.sessionTimeout;
        document.getElementById('maxLoginAttempts').value = settings.security.maxLoginAttempts;
        document.getElementById('requireUppercase').checked = settings.security.passwordPolicy.requireUppercase;
        document.getElementById('requireNumbers').checked = settings.security.passwordPolicy.requireNumbers;
        document.getElementById('requireSpecialChars').checked = settings.security.passwordPolicy.requireSpecialChars;
        document.getElementById('minPasswordLength').value = settings.security.passwordPolicy.minLength;

    } catch (error) {
        console.error('Ayarlar yükleme hatası:', error);
        showError('Ayarlar yüklenirken bir hata oluştu');
    }
}

// Form dinleyicilerini ayarla
function setupFormListeners() {
    // Genel ayarlar formu
    document.getElementById('generalSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            siteName: document.getElementById('siteName').value,
            siteDescription: document.getElementById('siteDescription').value,
            contactEmail: document.getElementById('contactEmail').value,
            timezone: document.getElementById('timezone').value
        };
        await saveSettings('general', formData);
    });

    // E-posta ayarları formu
    document.getElementById('emailSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            smtpHost: document.getElementById('smtpHost').value,
            smtpPort: parseInt(document.getElementById('smtpPort').value),
            smtpUser: document.getElementById('smtpUser').value,
            smtpPassword: document.getElementById('smtpPassword').value,
            emailFrom: document.getElementById('emailFrom').value
        };
        await saveSettings('email', formData);
    });

    // Randevu ayarları formu
    document.getElementById('appointmentSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            defaultDuration: parseInt(document.getElementById('appointmentDuration').value),
            minNoticeTime: parseInt(document.getElementById('minNoticeTime').value),
            workingHours: {
                start: document.getElementById('workingHoursStart').value,
                end: document.getElementById('workingHoursEnd').value
            },
            allowWeekends: document.getElementById('allowWeekends').checked
        };
        await saveSettings('appointments', formData);
    });

    // Güvenlik ayarları formu
    document.getElementById('securitySettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
            maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
            passwordPolicy: {
                requireUppercase: document.getElementById('requireUppercase').checked,
                requireNumbers: document.getElementById('requireNumbers').checked,
                requireSpecialChars: document.getElementById('requireSpecialChars').checked,
                minLength: parseInt(document.getElementById('minPasswordLength').value)
            }
        };
        await saveSettings('security', formData);
    });
}

// Ayarları kaydet
async function saveSettings(section, data) {
    try {
        const response = await fetch(`/api/admin/settings/${section}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Ayarlar kaydedilemedi');

        showSuccess('Ayarlar başarıyla kaydedildi');

    } catch (error) {
        console.error('Ayar kaydetme hatası:', error);
        showError('Ayarlar kaydedilirken bir hata oluştu');
    }
}

// E-posta ayarlarını test et
async function testEmailSettings() {
    try {
        const response = await fetch('/api/admin/settings/email/test', {
            method: 'POST',
            headers
        });

        if (!response.ok) throw new Error('E-posta testi başarısız');

        showSuccess('Test e-postası başarıyla gönderildi');

    } catch (error) {
        console.error('E-posta test hatası:', error);
        showError('Test e-postası gönderilirken bir hata oluştu');
    }
}

// Başarı mesajı göster
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container-fluid').prepend(alertDiv);
}

// Hata mesajı göster
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container-fluid').prepend(alertDiv);
}

// Çıkış yap
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});
