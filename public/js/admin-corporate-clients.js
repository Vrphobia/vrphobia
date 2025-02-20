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
    document.getElementById('organizationFilter').addEventListener('change', refreshClients);
    document.getElementById('therapistFilter').addEventListener('change', refreshClients);
    document.getElementById('statusFilter').addEventListener('change', refreshClients);

    // Client type change event for therapist assignment
    document.getElementById('clientType').addEventListener('change', function(e) {
        const therapistSelect = document.getElementById('assignedTherapist');
        if (e.target.value === 'individual') {
            therapistSelect.value = '1'; // Tuğçe Acar
        } else {
            therapistSelect.value = '2'; // Selen Çalışkan
        }
    });
}

// Set up filters
function setupFilters() {
    // Initialize filter values
    document.getElementById('organizationFilter').value = '';
    document.getElementById('therapistFilter').value = '';
    document.getElementById('statusFilter').value = '';
}

// Refresh clients list
async function refreshClients() {
    try {
        const organization = document.getElementById('organizationFilter').value;
        const therapist = document.getElementById('therapistFilter').value;
        const status = document.getElementById('statusFilter').value;

        // Build query parameters
        const params = new URLSearchParams();
        if (organization) params.append('organization', organization);
        if (therapist) params.append('therapist', therapist);
        if (status) params.append('status', status);

        // Fetch clients from API
        const response = await fetch(`/api/corporate-clients?${params.toString()}`);
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

    const progressPercentage = (client.total_sessions / 6) * 100;
    const remainingSessions = 6 - client.total_sessions;

    col.innerHTML = `
        <div class="card client-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0">${client.name} ${client.surname}</h5>
                    <span class="badge ${client.status === 'active' ? 'bg-success' : 'bg-secondary'}">${client.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                </div>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-building me-2"></i>${client.organization}
                </p>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-person me-2"></i>${client.client_type === 'individual' ? 'Bireysel' : 'Çocuk-Ergen'}
                </p>
                <p class="card-text text-muted small mb-3">
                    <i class="bi bi-person-badge me-2"></i>${client.therapist}
                </p>
                
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small text-muted">Kalan Seans</span>
                        <span class="badge badge-sessions bg-primary">${remainingSessions}/6</span>
                    </div>
                    <div class="progress session-progress">
                        <div class="progress-bar" role="progressbar" style="width: ${progressPercentage}%" 
                             aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100"></div>
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
        const response = await fetch(`/api/corporate-clients/${clientId}/sessions`);
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
        const notes = document.getElementById('completionNotes').value;

        // Send completion request to API
        const response = await fetch(`/api/appointments/${currentSessionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: notes,
                completion_time: new Date().toISOString()
            })
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
            organization: document.getElementById('organization').value,
            client_type: document.getElementById('clientType').value,
            name: document.getElementById('name').value,
            surname: document.getElementById('surname').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            assigned_therapist: document.getElementById('assignedTherapist').value
        };

        // Send create request to API
        const response = await fetch('/api/corporate-clients', {
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
        const response = await fetch(`/api/corporate-clients/${clientId}`);
        const client = await response.json();

        // Populate form
        document.getElementById('organization').value = client.organization;
        document.getElementById('clientType').value = client.client_type;
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

// Toast notifications
function showSuccess(message) {
    // Implement your preferred toast notification
    alert(message);
}

function showError(message) {
    // Implement your preferred toast notification
    alert(message);
}
