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

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadStatistics();
    initializeActivityChart();
    initializeUserDistributionChart();
    loadRecentActivities();
    loadUpcomingAppointments();
});

// Kullanıcı bilgilerini yükle
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    document.getElementById('userName').textContent = `${user.name || 'Admin'}`;
    document.getElementById('userAvatar').src = user.avatar || '/images/default-avatar.png';
}

// İstatistikleri yükle
async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/statistics', { headers });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('İstatistikler yüklenirken bir hata oluştu');
        }
        const data = await response.json();
        
        // İstatistikleri güncelle
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('activeAppointments').textContent = data.activeAppointments || 0;
        document.getElementById('activeTherapists').textContent = data.activeTherapists || 0;
        document.getElementById('activeClients').textContent = data.activeClients || 0;
        
        // Kullanıcı istatistikleri
        document.getElementById('totalClients').textContent = data.users.totalClients;
        document.getElementById('totalTherapists').textContent = data.users.totalTherapists;
        
        // Randevu istatistikleri
        document.getElementById('totalAppointments').textContent = data.appointments.totalAppointments;
        document.getElementById('completedAppointments').textContent = data.appointments.completedAppointments;
        document.getElementById('upcomingAppointments').textContent = data.appointments.upcomingAppointments;
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
        showError('İstatistikler yüklenirken bir hata oluştu');
    }
}

// Aktivite grafiğini başlat
function initializeActivityChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    window.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
            datasets: [{
                label: 'Sistem Aktivitesi',
                data: [65, 59, 80, 81, 56, 55, 40],
                fill: true,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Kullanıcı dağılımı grafiğini başlat
function initializeUserDistributionChart() {
    const ctx = document.getElementById('userDistributionChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Danışanlar', 'Terapistler', 'Adminler'],
            datasets: [{
                data: [70, 25, 5],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(155, 89, 182, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '70%'
        }
    });
}

// Son aktiviteleri yükle
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/admin/activities', { headers });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Aktiviteler yüklenirken bir hata oluştu');
        }
        const activities = await response.json();
        
        const activitiesList = document.getElementById('recentActivities');
        activitiesList.innerHTML = '';
        
        activities.forEach(activity => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${activity.user}</strong>
                    <span class="text-muted">${activity.description}</span>
                </div>
                <small class="text-muted">${formatDate(activity.timestamp)}</small>
            `;
            activitiesList.appendChild(li);
        });
    } catch (error) {
        console.error('Aktiviteler yüklenirken hata:', error);
        showError('Aktiviteler yüklenirken bir hata oluştu');
    }
}

// Yaklaşan randevuları yükle
async function loadUpcomingAppointments() {
    try {
        const response = await fetch('/api/admin/appointments/upcoming', { headers });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Randevular yüklenirken bir hata oluştu');
        }
        const appointments = await response.json();
        
        const appointmentsList = document.getElementById('upcomingAppointmentsList');
        appointmentsList.innerHTML = '';
        
        appointments.forEach(appointment => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${appointment.clientName}</strong> - 
                        <span class="text-muted">${appointment.therapistName}</span>
                    </div>
                    <div>
                        <span class="badge bg-primary">${formatDate(appointment.appointment_time)}</span>
                    </div>
                </div>
                <small class="text-muted">${appointment.type} - ${appointment.location}</small>
            `;
            appointmentsList.appendChild(li);
        });
    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        showError('Randevular yüklenirken bir hata oluştu');
    }
}

// Tarih formatla
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
}

// Hata mesajı göster
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

// Çıkış yap
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});

// Aktivite ikonlarını belirle
function getActivityIcon(type) {
    const icons = {
        login: 'bi-box-arrow-in-right',
        appointment: 'bi-calendar-check',
        user: 'bi-person',
        system: 'bi-gear',
        error: 'bi-exclamation-triangle'
    };
    return icons[type] || 'bi-circle';
}

// Zamanı formatla
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff/60000)} dakika önce`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} saat önce`;
    
    return date.toLocaleDateString('tr-TR');
}

// Toast mesajı göster
function showToast(type, message) {
    // Bootstrap toast kullanarak mesaj göster
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 5 saniye sonra toast'ı kaldır
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Dashboard'u yenile
function refreshDashboard() {
    loadStatistics();
    loadRecentActivities();
    loadUpcomingAppointments();
    showToast('success', 'Dashboard yenilendi');
}

// Rapor indir
async function exportReport() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:3002/api/admin/reports/export', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const blob = await response.blob();
        
        // Dosyayı indir
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('success', 'Rapor indirme başladı');
    } catch (error) {
        console.error('Rapor indirilirken hata:', error);
        showToast('error', 'Rapor indirilirken bir hata oluştu');
    }
}
