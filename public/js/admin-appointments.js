// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    loadAppointments();
    loadTherapists();
    loadClients();
    initializeDataTable();
    setupEventListeners();
});

// DataTable'ı başlat
function initializeDataTable() {
    $('#appointmentsTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
        }
    });
}

// Event listener'ları ayarla
function setupEventListeners() {
    document.getElementById('statusFilter').addEventListener('change', filterAppointments);
    document.getElementById('therapistFilter').addEventListener('change', filterAppointments);
    document.getElementById('dateFilter').addEventListener('change', filterAppointments);
    document.getElementById('searchFilter').addEventListener('input', filterAppointments);
}

// Randevuları yükle
async function loadAppointments() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:3002/api/admin/appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const appointments = await response.json();
        
        const tableBody = document.getElementById('appointmentsTableBody');
        tableBody.innerHTML = '';
        
        appointments.forEach(apt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${apt.id}</td>
                <td>${apt.clientName}</td>
                <td>${apt.therapistName}</td>
                <td>${formatDateTime(apt.appointment_time)}</td>
                <td>${apt.type}</td>
                <td>${apt.location}</td>
                <td>
                    <span class="badge bg-${getStatusColor(apt.status)}">
                        ${getStatusText(apt.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editAppointment(${apt.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment(${apt.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        showToast('error', 'Randevular yüklenirken bir hata oluştu');
    }
}

// Terapistleri yükle
async function loadTherapists() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:3002/api/admin/therapists', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const therapists = await response.json();
        
        const select = document.querySelector('select[name="therapistId"]');
        const filter = document.getElementById('therapistFilter');
        
        therapists.forEach(therapist => {
            const option = new Option(therapist.name + ' ' + therapist.surname, therapist.id);
            const filterOption = option.cloneNode(true);
            select.add(option);
            filter.add(filterOption);
        });
    } catch (error) {
        console.error('Terapistler yüklenirken hata:', error);
        showToast('error', 'Terapistler yüklenirken bir hata oluştu');
    }
}

// Danışanları yükle
async function loadClients() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:3002/api/admin/clients', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const clients = await response.json();
        
        const select = document.querySelector('select[name="clientId"]');
        clients.forEach(client => {
            const option = new Option(client.name + ' ' + client.surname, client.id);
            select.add(option);
        });
    } catch (error) {
        console.error('Danışanlar yüklenirken hata:', error);
        showToast('error', 'Danışanlar yüklenirken bir hata oluştu');
    }
}

// Yeni randevu kaydet
async function saveAppointment() {
    try {
        const form = document.getElementById('newAppointmentForm');
        const formData = new FormData(form);
        const appointmentData = Object.fromEntries(formData.entries());
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:3002/api/admin/appointments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            showToast('success', 'Randevu başarıyla kaydedildi');
            $('#newAppointmentModal').modal('hide');
            loadAppointments();
        } else {
            throw new Error('Randevu kaydedilemedi');
        }
    } catch (error) {
        console.error('Randevu kaydedilirken hata:', error);
        showToast('error', 'Randevu kaydedilirken bir hata oluştu');
    }
}

// Randevu düzenle
async function editAppointment(id) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`http://localhost:3002/api/admin/appointments/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const appointment = await response.json();
        
        // Form alanlarını doldur
        const form = document.getElementById('newAppointmentForm');
        form.querySelector('[name="clientId"]').value = appointment.client_id;
        form.querySelector('[name="therapistId"]').value = appointment.therapist_id;
        form.querySelector('[name="appointmentTime"]').value = appointment.appointment_time;
        form.querySelector('[name="type"]').value = appointment.type;
        form.querySelector('[name="location"]').value = appointment.location;
        form.querySelector('[name="notes"]').value = appointment.notes;
        
        // Modal'ı aç
        $('#newAppointmentModal').modal('show');
    } catch (error) {
        console.error('Randevu bilgileri yüklenirken hata:', error);
        showToast('error', 'Randevu bilgileri yüklenirken bir hata oluştu');
    }
}

// Randevu sil
async function deleteAppointment(id) {
    if (confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`http://localhost:3002/api/admin/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                showToast('success', 'Randevu başarıyla silindi');
                loadAppointments();
            } else {
                throw new Error('Randevu silinemedi');
            }
        } catch (error) {
            console.error('Randevu silinirken hata:', error);
            showToast('error', 'Randevu silinirken bir hata oluştu');
        }
    }
}

// Randevuları filtrele
function filterAppointments() {
    const status = document.getElementById('statusFilter').value;
    const therapist = document.getElementById('therapistFilter').value;
    const date = document.getElementById('dateFilter').value;
    const search = document.getElementById('searchFilter').value.toLowerCase();
    
    const table = document.getElementById('appointmentsTable');
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const statusCell = row.cells[6].textContent.toLowerCase();
        const therapistCell = row.cells[2].textContent;
        const dateCell = row.cells[3].textContent;
        const searchText = row.textContent.toLowerCase();
        
        const statusMatch = !status || statusCell.includes(status.toLowerCase());
        const therapistMatch = !therapist || therapistCell === therapist;
        const dateMatch = !date || dateCell.includes(date);
        const searchMatch = !search || searchText.includes(search);
        
        row.style.display = statusMatch && therapistMatch && dateMatch && searchMatch ? '' : 'none';
    }
}

// Yardımcı fonksiyonlar
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusColor(status) {
    const colors = {
        'scheduled': 'warning',
        'confirmed': 'success',
        'completed': 'info',
        'cancelled': 'danger',
        'pending': 'secondary'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'scheduled': 'Planlandı',
        'confirmed': 'Onaylandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi',
        'pending': 'Beklemede'
    };
    return texts[status] || status;
}

// Toast bildirimi göster
function showToast(type, message) {
    // Bootstrap toast kullanarak bildirim göster
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
    
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

// Çıkış yap
function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '/login.html';
}
