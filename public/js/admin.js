// Admin paneli için genel fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendiğinde gerekli verileri yükle
    loadDashboardData();
    
    // Çıkış butonu işleyicisi
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
});

// Dashboard verilerini yükle
async function loadDashboardData() {
    try {
        // İstatistikleri yükle
        await Promise.all([
            loadStatistics(),
            loadPaymentStats(),
            loadRecentTransactions(),
            loadCharts(),
            loadRecentActivities()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Dashboard verilerini yüklerken bir hata oluştu');
    }
}

// Genel istatistikleri yükle
async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/dashboard-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Statistics request failed');

        const data = await response.json();

        // İstatistikleri güncelle
        document.getElementById('totalClients').textContent = data.totalClients;
        document.getElementById('totalTherapists').textContent = data.totalTherapists;
        document.getElementById('pendingAppointments').textContent = data.pendingAppointments;
        document.getElementById('completedSessions').textContent = data.completedSessions;
    } catch (error) {
        console.error('Error loading statistics:', error);
        showError('İstatistikleri yüklerken bir hata oluştu');
    }
}

// Ödeme istatistiklerini yükle
async function loadPaymentStats() {
    try {
        const response = await fetch('/api/admin/payments/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Payment stats request failed');

        const data = await response.json();

        // Ödeme istatistiklerini güncelle
        document.getElementById('monthlyRevenue').textContent = 
            `₺${data.totalRevenue.toLocaleString('tr-TR')}`;
        document.getElementById('activeSubscriptions').textContent = 
            data.activeSubscriptions.toLocaleString('tr-TR');
        document.getElementById('pendingPayments').textContent = 
            data.pendingPayments.toLocaleString('tr-TR');
        document.getElementById('cancelledSubscriptions').textContent = 
            data.cancelledSubscriptions.toLocaleString('tr-TR');
    } catch (error) {
        console.error('Error loading payment stats:', error);
        showError('Ödeme istatistiklerini yüklerken bir hata oluştu');
    }
}

// Son işlemleri yükle
async function loadRecentTransactions() {
    try {
        const response = await fetch('/api/admin/payments/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Transactions request failed');

        const transactions = await response.json();
        const tbody = document.getElementById('recentTransactions');
        tbody.innerHTML = '';

        transactions.slice(0, 5).forEach(transaction => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(transaction.created_at).toLocaleDateString('tr-TR')}</td>
                <td>${transaction.user_name}</td>
                <td>${transaction.description || 'Ödeme'}</td>
                <td>₺${transaction.amount.toLocaleString('tr-TR')}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(transaction.status)}">
                        ${getStatusText(transaction.status)}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Son işlemleri yüklerken bir hata oluştu');
    }
}

// Grafikleri yükle
async function loadCharts() {
    try {
        // Randevu istatistikleri grafiği
        const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
        new Chart(appointmentsCtx, {
            type: 'line',
            data: {
                labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
                datasets: [{
                    label: 'Randevular',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#4e73df',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Danışan dağılımı grafiği
        const distributionCtx = document.getElementById('clientDistributionChart').getContext('2d');
        new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Kurumsal', 'Bireysel'],
                datasets: [{
                    data: [30, 70],
                    backgroundColor: ['#1cc88a', '#4e73df']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('Error loading charts:', error);
        showError('Grafikleri yüklerken bir hata oluştu');
    }
}

// Son aktiviteleri yükle
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/admin/recent-activities', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Activities request failed');

        const activities = await response.json();
        const container = document.getElementById('recentActivities');
        container.innerHTML = '';

        activities.forEach(activity => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${activity.title}</strong>
                        <p class="mb-0">${activity.description}</p>
                    </div>
                    <small class="text-muted">
                        ${new Date(activity.created_at).toLocaleString('tr-TR')}
                    </small>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        showError('Son aktiviteleri yüklerken bir hata oluştu');
    }
}

// Dashboard'u yenile
function refreshDashboard() {
    loadDashboardData();
}

// Rapor indir
async function exportReport() {
    try {
        const response = await fetch('/api/admin/export-report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Export request failed');

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
        showError('Rapor indirirken bir hata oluştu');
    }
}

// Çıkış yap
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Hata göster
function showError(message) {
    // Bootstrap toast veya alert ile hata göster
    alert(message);
}

// İşlem durumu için badge rengi
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'success':
        case 'completed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'failed':
            return 'danger';
        default:
            return 'secondary';
    }
}

// İşlem durumu metni
function getStatusText(status) {
    switch (status.toLowerCase()) {
        case 'success':
        case 'completed':
            return 'Başarılı';
        case 'pending':
            return 'Bekliyor';
        case 'failed':
            return 'Başarısız';
        default:
            return status;
    }
}
