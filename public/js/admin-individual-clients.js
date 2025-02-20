// Global variables
let currentClientId = null;
let currentSessionId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    refreshClients();

    // Set up event listeners
    setupEventListeners();

    // Initialize filters
    setupFilters();
});

// Set up event listeners
function setupEventListeners() {
    // Filter change events
    document.getElementById('therapyTypeFilter').addEventListener('change', refreshClients);
    document.getElementById('therapistFilter').addEventListener('change', refreshClients);
    document.getElementById('statusFilter').addEventListener('change', refreshClients);

    // Therapy type change event for therapist assignment
    document.getElementById('therapyType').addEventListener('change', function(e) {
        const therapistSelect = document.getElementById('assignedTherapist');
        // Çocuk-Ergen terapisi seçilirse Selen Çalışkan'ı ata
        if (e.target.value === '4') {
            therapistSelect.value = '2'; // Selen Çalışkan
        } else {
            therapistSelect.value = '1'; // Tuğçe Acar
        }
    });
}

// Set up filters
function setupFilters() {
    // Initialize filter values
    document.getElementById('therapyTypeFilter').value = '';
    document.getElementById('therapistFilter').value = '';
    document.getElementById('statusFilter').value = '';
}

// Refresh clients list
async function refreshClients() {
    try {
        const therapyType = document.getElementById('therapyTypeFilter').value;
        const therapist = document.getElementById('therapistFilter').value;
        const status = document.getElementById('statusFilter').value;

        // Build query parameters
        const params = new URLSearchParams();
        if (therapyType) params.append('therapy_type', therapyType);
        if (therapist) params.append('therapist', therapist);
        if (status) params.append('status', status);

        // Fetch clients from API
        const response = await fetch(`/api/individual-clients?${params.toString()}`);
        const clients = await response.json();

        // Display clients
        displayClients(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        showError('Danışan listesi alınamadı');
    }
}

// Display clients in cards
function displayClients(clients) {
    const clientsList = document.getElementById('clientsList');
    clientsList.innerHTML = '';

    clients.forEach(client => {
        const card = createClientCard(client);
        clientsList.appendChild(card);
    });
}

// Create a client card
function createClientCard(client) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';

    col.innerHTML = `
        <div class="card client-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0">${client.name} ${client.surname}</h5>
                    <span class="badge ${client.status === 'active' ? 'bg-success' : 'bg-secondary'}">${client.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                </div>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-tag me-2"></i>${getTherapyTypeName(client.therapy_type)}
                </p>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-person-badge me-2"></i>${client.therapist}
                </p>
                <p class="card-text text-muted small mb-3">
                    <i class="bi bi-cash me-2"></i>Toplam Ödeme: ₺${client.total_payment.toLocaleString('tr-TR')}
                </p>
                
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small text-muted">Toplam Seans</span>
                        <span class="badge badge-sessions bg-primary">${client.total_sessions}</span>
                    </div>
                </div>

                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="viewSessions(${client.id})">
                        <i class="bi bi-calendar2-week me-1"></i>Seanslar
                    </button>
                    <button class="btn btn-sm btn-outline-secondary flex-grow-1" onclick="editClient(${client.id})">
                        <i class="bi bi-pencil me-1"></i>Düzenle
                    </button>
                </div>
            </div>
        </div>
    `;

    return col;
}

// View client sessions
async function viewSessions(clientId) {
    try {
        currentClientId = clientId;
        
        // Fetch sessions from API
        const response = await fetch(`/api/individual-clients/${clientId}/sessions`);
        const sessions = await response.json();

        // Display sessions in modal
        displaySessions(sessions);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('viewSessionsModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching sessions:', error);
        showError('Seans bilgileri alınamadı');
    }
}

// Display sessions in table
function displaySessions(sessions) {
    const tbody = document.querySelector('#sessionsTable tbody');
    tbody.innerHTML = '';

    sessions.forEach(session => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(session.appointment_time)}</td>
            <td>${session.therapist}</td>
            <td>₺${session.payment_amount ? session.payment_amount.toLocaleString('tr-TR') : '-'}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(session.status)}">
                    ${getStatusText(session.status)}
                </span>
            </td>
            <td>
                ${session.status === 'scheduled' ? `
                    <button class="btn btn-sm btn-success" onclick="showCompleteSession(${session.id})">
                        <i class="bi bi-check-lg me-1"></i>Tamamla
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Show complete session modal
function showCompleteSession(sessionId) {
    currentSessionId = sessionId;
    
    // Reset form
    document.getElementById('completeSessionForm').reset();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('completeSessionModal'));
    modal.show();
}

// Complete session
async function completeSession() {
    try {
        const formData = {
            payment_amount: document.getElementById('paymentAmount').value,
            payment_method: document.getElementById('paymentMethod').value,
            notes: document.getElementById('completionNotes').value,
            completion_time: new Date().toISOString()
        };

        // Send completion request to API
        const response = await fetch(`/api/appointments/${currentSessionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Seans tamamlanamadı');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('completeSessionModal'));
        modal.hide();

        // Refresh sessions list
        viewSessions(currentClientId);

        // Show success message
        showSuccess('Seans başarıyla tamamlandı');
    } catch (error) {
        console.error('Error completing session:', error);
        showError('Seans tamamlanamadı');
    }
}

// Save new client
async function saveClient() {
    try {
        const formData = {
            therapy_type: document.getElementById('therapyType').value,
            name: document.getElementById('name').value,
            surname: document.getElementById('surname').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            assigned_therapist: document.getElementById('assignedTherapist').value
        };

        // Send create request to API
        const response = await fetch('/api/individual-clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Danışan eklenemedi');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addClientModal'));
        modal.hide();

        // Reset form
        document.getElementById('addClientForm').reset();

        // Refresh clients list
        refreshClients();

        // Show success message
        showSuccess('Danışan başarıyla eklendi');
    } catch (error) {
        console.error('Error saving client:', error);
        showError('Danışan eklenemedi');
    }
}

// Edit client
async function editClient(clientId) {
    try {
        // Fetch client details from API
        const response = await fetch(`/api/individual-clients/${clientId}`);
        const client = await response.json();

        // Populate form
        document.getElementById('therapyType').value = client.therapy_type;
        document.getElementById('name').value = client.name;
        document.getElementById('surname').value = client.surname;
        document.getElementById('phone').value = client.phone;
        document.getElementById('email').value = client.email;
        document.getElementById('assignedTherapist').value = client.assigned_therapist;

        // Update modal title
        document.querySelector('#addClientModal .modal-title').textContent = 'Danışan Düzenle';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addClientModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching client:', error);
        showError('Danışan bilgileri alınamadı');
    }
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'scheduled': return 'bg-primary';
        case 'completed': return 'bg-success';
        case 'cancelled': return 'bg-danger';
        case 'no_show': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'scheduled': return 'Planlandı';
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal Edildi';
        case 'no_show': return 'Gelmedi';
        default: return status;
    }
}

function getTherapyTypeName(id) {
    const types = {
        1: 'Kedi Fobisi',
        2: 'Uçuş Fobisi',
        3: 'Çift Terapisi',
        4: 'Çocuk-Ergen Terapisi'
    };
    return types[id] || 'Bilinmiyor';
}

// Toast notifications
function showSuccess(message) {
    // Implement your preferred toast notification
    alert(message);
}

function showError(message) {
    // Implement your preferred toast notification
    alert(message);
}
