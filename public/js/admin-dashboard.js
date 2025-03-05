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
document.addEventListener('DOMContentLoaded', async () => {
    loadUserInfo();
    loadStatistics();
    initializeActivityChart();
    initializeUserDistributionChart();
    loadRecentActivities();
    loadUpcomingAppointments();
    refreshDashboard();
    await loadTherapistPerformance();
    loadClients();
    
    // Terapist listesini yükle
    try {
        const response = await fetch('/api/therapists', { headers });
        if (!response.ok) throw new Error('Terapist listesi alınamadı');
        
        const therapists = await response.json();
        const select = document.getElementById('therapistFilter');
        
        therapists.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${t.name} ${t.surname}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading therapist list:', error);
        showError('Terapist listesi yüklenirken bir hata oluştu');
    }
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
        
        return data;
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
async function refreshDashboard() {
    const stats = await loadStatistics();
    if (stats) {
        createCharts(stats);
    }
    await loadRecentActivities();
    await loadUpcomingAppointments();
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

// Token ve kullanıcı bilgilerini kontrol et
let userData = JSON.parse(localStorage.getItem('user'));

if (!token || !userData) {
    window.location.href = '/login.html';
}

// Çıkış yapma işlemi
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

// İstatistikleri yükle
async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/statistics', { headers });
        if (!response.ok) throw new Error('İstatistikler alınamadı');
        
        const stats = await response.json();
        
        document.getElementById('totalClients').textContent = stats.totalClients;
        document.getElementById('totalTherapists').textContent = stats.totalTherapists;
        document.getElementById('pendingAppointments').textContent = stats.pendingAppointments;
        document.getElementById('completedSessions').textContent = stats.completedSessions;
        
        return stats;
    } catch (error) {
        console.error('Error loading statistics:', error);
        showError('İstatistikler yüklenirken bir hata oluştu');
    }
}

// Grafikleri oluştur
function createCharts(stats) {
    // Randevu İstatistikleri Grafiği
    const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
    new Chart(appointmentsCtx, {
        type: 'line',
        data: {
            labels: stats.appointmentStats.labels,
            datasets: [{
                label: 'Randevular',
                data: stats.appointmentStats.data,
                borderColor: '#4e73df',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Danışan Dağılımı Grafiği
    const distributionCtx = document.getElementById('clientDistributionChart').getContext('2d');
    new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Bireysel', 'Kurumsal'],
            datasets: [{
                data: [stats.individualClients, stats.corporateClients],
                backgroundColor: ['#1cc88a', '#4e73df']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Son aktiviteleri yükle
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/admin/activities', { headers });
        if (!response.ok) throw new Error('Aktiviteler alınamadı');
        
        const activities = await response.json();
        const container = document.getElementById('recentActivities');
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${activity.user}</strong>
                        ${activity.action}
                    </div>
                    <small class="text-muted">${new Date(activity.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading activities:', error);
        showError('Aktiviteler yüklenirken bir hata oluştu');
    }
}

// Rapor indir
async function exportReport() {
    try {
        const response = await fetch('/api/admin/export-report', {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) throw new Error('Rapor oluşturulamadı');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Error exporting report:', error);
        showError('Rapor oluşturulurken bir hata oluştu');
    }
}

// Hata göster
function showError(message) {
    // Bootstrap toast veya alert kullanarak hata mesajını göster
    alert(message);
}

// Filtreleri uygula
async function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const therapistId = document.getElementById('therapistFilter').value;
    const clientType = document.getElementById('clientTypeFilter').value;

    try {
        const response = await fetch(`/api/admin/filtered-statistics?startDate=${startDate}&endDate=${endDate}&therapistId=${therapistId}&clientType=${clientType}`, {
            headers: headers
        });

        if (!response.ok) throw new Error('Filtrelenmiş veriler alınamadı');
        
        const stats = await response.json();
        
        // İstatistikleri güncelle
        document.getElementById('totalAppointments').textContent = stats.total;
        document.getElementById('completedAppointments').textContent = stats.completed;
        document.getElementById('cancelledAppointments').textContent = stats.cancelled;
        document.getElementById('averageRating').textContent = 
            stats.avg_rating ? stats.avg_rating.toFixed(2) : 'N/A';
            
    } catch (error) {
        console.error('Error applying filters:', error);
        showError('Filtreler uygulanırken bir hata oluştu');
    }
}

// PDF rapor indir
async function exportPdfReport() {
    try {
        const response = await fetch('/api/admin/pdf-report', {
            headers: headers
        });
        
        if (!response.ok) throw new Error('PDF rapor oluşturulamadı');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showError('PDF rapor oluşturulurken bir hata oluştu');
    }
}

// Finansal rapor indir
async function exportFinancialReport() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const response = await fetch(`/api/admin/financial-report?startDate=${startDate}&endDate=${endDate}`, {
            headers: headers
        });
        
        if (!response.ok) throw new Error('Finansal rapor alınamadı');
        
        const data = await response.json();
        
        // Excel dosyası oluştur
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Finansal Rapor');
        
        worksheet.columns = [
            { header: 'Ay', key: 'month' },
            { header: 'Toplam Tutar', key: 'total_amount' },
            { header: 'Ödeme Sayısı', key: 'payment_count' },
            { header: 'Alınan Ödemeler', key: 'received_amount' },
            { header: 'Bekleyen Ödemeler', key: 'pending_amount' }
        ];
        
        worksheet.addRows(data);
        
        const blob = await workbook.xlsx.writeBuffer();
        const url = window.URL.createObjectURL(new Blob([blob]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `finansal-rapor-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Error exporting financial report:', error);
        showError('Finansal rapor oluşturulurken bir hata oluştu');
    }
}

// Terapist performanslarını yükle
async function loadTherapistPerformance() {
    try {
        const response = await fetch('/api/admin/therapist-performance', {
            headers: headers
        });
        
        if (!response.ok) throw new Error('Terapist performans verileri alınamadı');
        
        const performance = await response.json();
        const tbody = document.getElementById('therapistPerformance');
        
        tbody.innerHTML = performance.map(p => `
            <tr>
                <td>${p.name} ${p.surname}</td>
                <td>${p.total_sessions}</td>
                <td>${p.completed_sessions}</td>
                <td>${p.avg_rating ? p.avg_rating.toFixed(2) : 'N/A'}</td>
                <td>${p.unique_clients}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading therapist performance:', error);
        showError('Terapist performans verileri yüklenirken bir hata oluştu');
    }
}

// Bildirim ayarlarını kaydet
async function saveNotificationSettings() {
    try {
        const settings = {
            newAppointmentNotification: document.getElementById('newAppointmentNotification').checked,
            cancelledAppointmentNotification: document.getElementById('cancelledAppointmentNotification').checked,
            paymentReminderNotification: document.getElementById('paymentReminderNotification').checked,
            systemAlertNotification: document.getElementById('systemAlertNotification').checked
        };
        
        const response = await fetch('/api/admin/notification-settings', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Bildirim ayarları kaydedilemedi');
        
        showSuccess('Bildirim ayarları başarıyla kaydedildi');
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showError('Bildirim ayarları kaydedilirken bir hata oluştu');
    }
}

// Başarı mesajı göster
function showSuccess(message) {
    // Bootstrap toast veya alert kullanarak başarı mesajını göster
    alert(message);
}

// Danışan listesini yükle
async function loadClients() {
    try {
        const response = await fetch('/api/admin/clients');
        if (!response.ok) throw new Error('Danışanlar yüklenirken hata oluştu');
        
        const clients = await response.json();
        const clientList = document.getElementById('clientList');
        clientList.innerHTML = '';

        clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.client_number || '-'}</td>
                <td>${client.name} ${client.surname}</td>
                <td>${client.email}</td>
                <td>${client.phone || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-number-btn" 
                            data-id="${client.id}" 
                            data-number="${client.client_number || ''}">
                        Numara Düzenle
                    </button>
                </td>
            `;
            clientList.appendChild(row);
        });

        // Numara düzenleme butonlarına event listener ekle
        document.querySelectorAll('.edit-number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const clientId = btn.dataset.id;
                const currentNumber = btn.dataset.number;
                
                document.getElementById('editClientId').value = clientId;
                document.getElementById('editClientNumber').value = currentNumber;
                
                new bootstrap.Modal(document.getElementById('editClientNumberModal')).show();
            });
        });

    } catch (error) {
        console.error('Danışanlar yüklenirken hata:', error);
        showAlert('error', 'Danışanlar yüklenirken bir hata oluştu');
    }
}

// Yeni danışan ekleme
document.getElementById('addClientForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        name: document.getElementById('clientName').value,
        surname: document.getElementById('clientSurname').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        password: document.getElementById('clientPassword').value
    };

    try {
        const response = await fetch('/api/admin/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Danışan eklenirken hata oluştu');

        const result = await response.json();
        showAlert('success', `Danışan başarıyla eklendi. Danışan Numarası: ${result.client_number}`);
        
        // Formu temizle
        e.target.reset();
        
        // Listeyi güncelle
        loadClients();

    } catch (error) {
        console.error('Danışan eklenirken hata:', error);
        showAlert('error', 'Danışan eklenirken bir hata oluştu');
    }
});

// Danışan numarası düzenleme
document.getElementById('editClientNumberForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientId = document.getElementById('editClientId').value;
    const clientNumber = document.getElementById('editClientNumber').value;

    try {
        const response = await fetch(`/api/admin/clients/${clientId}/number`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ client_number: clientNumber })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Danışan numarası güncellenirken hata oluştu');
        }

        // Modal'ı kapat
        bootstrap.Modal.getInstance(document.getElementById('editClientNumberModal')).hide();
        
        showAlert('success', 'Danışan numarası başarıyla güncellendi');
        
        // Listeyi güncelle
        loadClients();

    } catch (error) {
        console.error('Danışan numarası güncellenirken hata:', error);
        showAlert('error', error.message);
    }
});

// Sayfa yüklendiğinde danışan listesini yükle
document.addEventListener('DOMContentLoaded', () => {
    loadClients();
});

// Genel durum istatistiklerini yükle
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/dashboard-stats');
        if (!response.ok) throw new Error('İstatistikler yüklenirken hata oluştu');
        
        const stats = await response.json();
        
        // İstatistikleri göster
        document.getElementById('totalClients').textContent = stats.totalClients;
        document.getElementById('activeTherapists').textContent = stats.activeTherapists;
        document.getElementById('monthlyAppointments').textContent = stats.monthlyAppointments;
        document.getElementById('monthlyIncome').textContent = `₺${stats.monthlyIncome.toLocaleString()}`;
        
        // Seans grafiğini çiz
        const appointmentCtx = document.getElementById('appointmentStats').getContext('2d');
        new Chart(appointmentCtx, {
            type: 'line',
            data: {
                labels: stats.appointmentStats.labels,
                datasets: [{
                    label: 'Seanslar',
                    data: stats.appointmentStats.data,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            }
        });
        
        // Gelir grafiğini çiz
        const incomeCtx = document.getElementById('incomeStats').getContext('2d');
        new Chart(incomeCtx, {
            type: 'bar',
            data: {
                labels: stats.incomeStats.labels,
                datasets: [{
                    label: 'Gelir',
                    data: stats.incomeStats.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                }]
            }
        });

    } catch (error) {
        console.error('Dashboard istatistikleri yüklenirken hata:', error);
        showAlert('error', 'İstatistikler yüklenirken bir hata oluştu');
    }
}

// VR içerik yönetimi
async function loadVRContent() {
    try {
        // Fobi türlerini yükle
        const phobiaResponse = await fetch('/api/admin/phobia-types');
        if (!phobiaResponse.ok) throw new Error('Fobi türleri yüklenirken hata oluştu');
        
        const phobiaTypes = await phobiaResponse.json();
        const phobiaSelect = document.querySelector('select[name="phobia_type_id"]');
        phobiaSelect.innerHTML = phobiaTypes.map(type => 
            `<option value="${type.id}">${type.name}</option>`
        ).join('');
        
        // VR senaryoları yükle
        const scenarioResponse = await fetch('/api/admin/vr-scenarios');
        if (!scenarioResponse.ok) throw new Error('VR senaryoları yüklenirken hata oluştu');
        
        const scenarios = await scenarioResponse.json();
        const scenarioList = document.getElementById('vrScenarioList');
        scenarioList.innerHTML = scenarios.map(scenario => `
            <tr>
                <td>${scenario.name}</td>
                <td>${scenario.phobia_type}</td>
                <td>${'⭐'.repeat(scenario.difficulty_level)}</td>
                <td>${scenario.duration_minutes} dk</td>
                <td>${scenario.usage_count || 0}</td>
                <td>${scenario.success_rate ? scenario.success_rate + '%' : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-scenario-btn" data-id="${scenario.id}">
                        Düzenle
                    </button>
                    <button class="btn btn-sm btn-danger delete-scenario-btn" data-id="${scenario.id}">
                        Sil
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('VR içerik yüklenirken hata:', error);
        showAlert('error', 'VR içerik yüklenirken bir hata oluştu');
    }
}

// Finans yönetimi
async function loadFinancialData() {
    try {
        const response = await fetch('/api/admin/financial-summary');
        if (!response.ok) throw new Error('Finansal veriler yüklenirken hata oluştu');
        
        const data = await response.json();
        
        // Finansal özeti göster
        document.getElementById('monthlyRevenue').textContent = `₺${data.monthlyRevenue.toLocaleString()}`;
        document.getElementById('pendingPayments').textContent = `₺${data.pendingPayments.toLocaleString()}`;
        document.getElementById('avgSessionFee').textContent = `₺${data.avgSessionFee.toLocaleString()}`;
        document.getElementById('collectionRate').textContent = `%${data.collectionRate}`;
        
        // Ödemeleri listele
        const paymentList = document.getElementById('paymentList');
        paymentList.innerHTML = data.recentPayments.map(payment => `
            <tr>
                <td>${new Date(payment.payment_date).toLocaleDateString('tr-TR')}</td>
                <td>${payment.client_name}</td>
                <td>₺${payment.amount.toLocaleString()}</td>
                <td>
                    <span class="badge bg-${payment.status === 'completed' ? 'success' : 'warning'}">
                        ${payment.status === 'completed' ? 'Ödendi' : 'Bekliyor'}
                    </span>
                </td>
                <td>
                    ${payment.invoice_number ? `
                        <a href="/api/admin/invoices/${payment.invoice_number}" class="btn btn-sm btn-secondary">
                            Fatura
                        </a>
                    ` : '-'}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary edit-payment-btn" data-id="${payment.id}">
                        Düzenle
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Finansal veriler yüklenirken hata:', error);
        showAlert('error', 'Finansal veriler yüklenirken bir hata oluştu');
    }
}

// Ayarlar
async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) throw new Error('Ayarlar yüklenirken hata oluştu');
        
        const settings = await response.json();
        
        // Güvenlik ayarları
        document.getElementById('enable2FA').checked = settings.security.twoFactorEnabled;
        document.getElementById('enableAuditLog').checked = settings.security.auditLogEnabled;
        document.getElementById('enableBackup').checked = settings.security.autoBackupEnabled;
        
        // Bildirim ayarları
        document.getElementById('newAppointmentNotification').checked = settings.notifications.newAppointment;
        document.getElementById('cancelledAppointmentNotification').checked = settings.notifications.cancelledAppointment;
        document.getElementById('paymentReminderNotification').checked = settings.notifications.paymentReminder;
        document.getElementById('systemAlertNotification').checked = settings.notifications.systemAlert;
        
        // Sistem bilgileri
        document.getElementById('systemVersion').textContent = settings.system.version;
        document.getElementById('lastBackup').textContent = settings.system.lastBackup;
        document.getElementById('databaseSize').textContent = settings.system.databaseSize;
        document.getElementById('storageUsage').textContent = settings.system.storageUsage;

    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        showAlert('error', 'Ayarlar yüklenirken bir hata oluştu');
    }
}

// Tab değişikliğinde ilgili içeriği yükle
document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', (event) => {
        const target = event.target.getAttribute('data-bs-target');
        switch (target) {
            case '#dashboard':
                loadDashboardStats();
                break;
            case '#vr-content':
                loadVRContent();
                break;
            case '#finance':
                loadFinancialData();
                break;
            case '#settings':
                loadSettings();
                break;
        }
    });
});

// Sayfa yüklendiğinde dashboard istatistiklerini yükle
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
});
