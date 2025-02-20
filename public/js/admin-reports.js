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

// Grafikleri tutacak değişkenler
let appointmentsChart;
let usersChart;
let activitiesChart;

// DataTables instance
let appointmentsTable;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeDataTable();
    loadData();

    // Event listeners
    document.getElementById('startDate').addEventListener('change', loadData);
    document.getElementById('endDate').addEventListener('change', loadData);
    document.getElementById('reportType').addEventListener('change', loadData);
});

// Grafikleri başlat
function initializeCharts() {
    // Randevu grafiği
    const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
    appointmentsChart = new Chart(appointmentsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Toplam Randevu',
                data: [],
                borderColor: '#3498db',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // Kullanıcı grafiği
    const usersCtx = document.getElementById('usersChart').getContext('2d');
    usersChart = new Chart(usersCtx, {
        type: 'pie',
        data: {
            labels: ['Danışanlar', 'Terapistler', 'Adminler'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#2ecc71', '#3498db', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // Aktivite grafiği
    const activitiesCtx = document.getElementById('activitiesChart').getContext('2d');
    activitiesChart = new Chart(activitiesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Aktiviteler',
                data: [],
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// DataTable'ı başlat
function initializeDataTable() {
    appointmentsTable = $('#appointmentsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
        },
        order: [[0, 'desc']],
        pageLength: 10,
        columns: [
            { data: 'appointment_time' },
            { data: 'clientName' },
            { data: 'therapistName' },
            { data: 'status' },
            { data: 'type' },
            { data: 'location' }
        ]
    });
}

// Verileri yükle
async function loadData() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reportType = document.getElementById('reportType').value;

        const params = new URLSearchParams({
            startDate,
            endDate,
            type: reportType
        });

        // Randevu verilerini yükle
        const appointmentsResponse = await fetch(`/api/admin/reports/appointments?${params}`, { headers });
        if (!appointmentsResponse.ok) throw new Error('Randevu verileri alınamadı');
        const appointmentsData = await appointmentsResponse.json();
        updateAppointmentsChart(appointmentsData);
        updateAppointmentsTable(appointmentsData);

        // Kullanıcı verilerini yükle
        const usersResponse = await fetch(`/api/admin/reports/users?${params}`, { headers });
        if (!usersResponse.ok) throw new Error('Kullanıcı verileri alınamadı');
        const usersData = await usersResponse.json();
        updateUsersChart(usersData);

        // Aktivite verilerini yükle
        const activitiesResponse = await fetch(`/api/admin/reports/activities?${params}`, { headers });
        if (!activitiesResponse.ok) throw new Error('Aktivite verileri alınamadı');
        const activitiesData = await activitiesResponse.json();
        updateActivitiesChart(activitiesData);

    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showError('Veriler yüklenirken bir hata oluştu');
    }
}

// Randevu grafiğini güncelle
function updateAppointmentsChart(data) {
    appointmentsChart.data.labels = data.labels;
    appointmentsChart.data.datasets[0].data = data.values;
    appointmentsChart.update();
}

// Kullanıcı grafiğini güncelle
function updateUsersChart(data) {
    usersChart.data.datasets[0].data = [
        data.clients,
        data.therapists,
        data.admins
    ];
    usersChart.update();
}

// Aktivite grafiğini güncelle
function updateActivitiesChart(data) {
    activitiesChart.data.labels = data.labels;
    activitiesChart.data.datasets[0].data = data.values;
    activitiesChart.update();
}

// Randevu tablosunu güncelle
function updateAppointmentsTable(data) {
    appointmentsTable.clear();
    appointmentsTable.rows.add(data.appointments);
    appointmentsTable.draw();
}

// Raporu dışa aktar
async function exportReport(format) {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reportType = document.getElementById('reportType').value;

        const params = new URLSearchParams({
            startDate,
            endDate,
            type: reportType,
            format
        });

        const response = await fetch(`/api/admin/reports/export?${params}`, {
            headers,
            method: 'GET'
        });

        if (!response.ok) throw new Error('Rapor oluşturulamadı');

        // Dosyayı indir
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Rapor dışa aktarma hatası:', error);
        showError('Rapor dışa aktarılırken bir hata oluştu');
    }
}

// Raporları yenile
function refreshReports() {
    loadData();
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
