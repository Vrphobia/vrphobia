// Client Details Page JavaScript
class ClientDetailsManager {
    constructor() {
        this.clientId = new URLSearchParams(window.location.search).get('id');
        this.googleCalendar = null;
        this.charts = {
            progress: null,
            payment: null
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadClientData();
            await Promise.all([
                this.loadStatistics(),
                this.loadAppointmentHistory()
            ]);
            this.initializeCharts();
            this.initGoogleCalendar();
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Sayfa yüklenirken bir hata oluştu.');
        }
    }

    async loadClientData() {
        try {
            const response = await fetch(`/api/clients/${this.clientId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Client data fetch failed');

            const client = await response.json();
            this.updateClientUI(client);
        } catch (error) {
            throw new Error('Failed to load client data: ' + error.message);
        }
    }

    updateClientUI(client) {
        document.getElementById('clientName').textContent = `${client.firstName} ${client.lastName}`;
        document.getElementById('clientCompany').textContent = client.company?.name || 'N/A';
        document.getElementById('clientEmail').textContent = client.email;
        document.getElementById('clientPhone').textContent = client.phone || 'N/A';
        document.getElementById('clientDepartment').textContent = client.department || 'N/A';
        document.getElementById('clientPosition').textContent = client.position || 'N/A';
    }

    async loadStatistics() {
        try {
            const response = await fetch(`/api/clients/${this.clientId}/statistics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Statistics fetch failed');

            const stats = await response.json();
            this.updateStatisticsUI(stats);
        } catch (error) {
            throw new Error('Failed to load statistics: ' + error.message);
        }
    }

    updateStatisticsUI(stats) {
        document.getElementById('totalSessions').textContent = stats.totalSessions;
        document.getElementById('completedSessions').textContent = stats.completedSessions;
        document.getElementById('cancelledSessions').textContent = stats.cancelledSessions;
        document.getElementById('avgSessionDuration').textContent = `${stats.averageSessionDuration} dk`;
        document.getElementById('totalPayments').textContent = this.formatCurrency(stats.totalPayments);
        document.getElementById('pendingPayments').textContent = this.formatCurrency(stats.pendingPayments);
        document.getElementById('lastPaymentDate').textContent = this.formatDate(stats.lastPaymentDate);
        document.getElementById('paymentStatus').textContent = this.getPaymentStatusText(stats.paymentStatus);
    }

    async loadAppointmentHistory() {
        try {
            const response = await fetch(`/api/clients/${this.clientId}/appointments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Appointment history fetch failed');

            const appointments = await response.json();
            this.updateAppointmentHistoryUI(appointments);
        } catch (error) {
            throw new Error('Failed to load appointment history: ' + error.message);
        }
    }

    updateAppointmentHistoryUI(appointments) {
        const tbody = document.getElementById('appointmentHistory');
        tbody.innerHTML = appointments.map(apt => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatDate(apt.date)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${apt.type}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(apt.status)}">
                        ${apt.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${apt.therapist}</td>
            </tr>
        `).join('');
    }

    initializeCharts() {
        const progressCtx = document.getElementById('progressChart').getContext('2d');
        const paymentCtx = document.getElementById('paymentChart').getContext('2d');

        this.charts.progress = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'İlerleme Puanı',
                    data: [],
                    borderColor: '#4F46E5',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        this.charts.payment = new Chart(paymentCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Ödeme Tutarı',
                    data: [],
                    backgroundColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    initGoogleCalendar() {
        // Google Calendar initialization code
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: process.env.GOOGLE_CALENDAR_API_KEY,
                clientId: process.env.GOOGLE_CLIENT_ID,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.readonly'
            }).then(() => {
                gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));
                this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            });
        });
    }

    updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            this.loadCalendarEvents();
        }
    }

    async loadCalendarEvents() {
        try {
            const response = await gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': (new Date()).toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime'
            });

            const events = response.result.items;
            this.updateCalendarUI(events);
        } catch (error) {
            console.error('Error loading calendar events:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('editClient').addEventListener('click', () => {
            window.location.href = `/edit-client.html?id=${this.clientId}`;
        });

        document.getElementById('scheduleAppointment').addEventListener('click', () => {
            window.location.href = `/schedule-appointment.html?clientId=${this.clientId}`;
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }

    // Utility Methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }

    getStatusColor(status) {
        const colors = {
            'Tamamlandı': 'bg-green-100 text-green-800',
            'İptal Edildi': 'bg-red-100 text-red-800',
            'Beklemede': 'bg-yellow-100 text-yellow-800',
            'default': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || colors.default;
    }

    getPaymentStatusText(status) {
        const statusTexts = {
            'paid': 'Ödenmiş',
            'pending': 'Beklemede',
            'overdue': 'Gecikmiş',
            'default': 'Bilinmiyor'
        };
        return statusTexts[status] || statusTexts.default;
    }

    showError(message) {
        // Implement error notification
        console.error(message);
        // You could add a toast notification here
    }
}

// For browser usage
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new ClientDetailsManager();
    });
}

// For testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClientDetailsManager };
}
