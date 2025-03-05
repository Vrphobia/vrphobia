const moment = require('moment');

class ReportingService {
    constructor(db) {
        this.db = db;
    }

    // Tedavi başarı oranları
    async getTherapySuccessRates(startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                t.therapy_type_id,
                tt.name as therapy_name,
                COUNT(*) as total_sessions,
                SUM(CASE WHEN t.success_rating >= 7 THEN 1 ELSE 0 END) as successful_sessions,
                AVG(t.success_rating) as average_rating
            FROM therapy_sessions t
            JOIN therapy_types tt ON t.therapy_type_id = tt.id
            WHERE t.session_date BETWEEN ? AND ?
            GROUP BY t.therapy_type_id, tt.name
        `, [startDate, endDate]);

        return results.map(row => ({
            ...row,
            success_rate: (row.successful_sessions / row.total_sessions) * 100
        }));
    }

    // Danışan ilerleme raporu
    async getClientProgress(clientId, startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                s.session_date,
                s.anxiety_level_start,
                s.anxiety_level_end,
                s.success_rating,
                s.notes,
                tt.name as therapy_type
            FROM therapy_sessions s
            JOIN therapy_types tt ON s.therapy_type_id = tt.id
            WHERE s.client_id = ? 
            AND s.session_date BETWEEN ? AND ?
            ORDER BY s.session_date
        `, [clientId, startDate, endDate]);

        return results;
    }

    // Finansal raporlar
    async getFinancialReport(startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                DATE_FORMAT(payment_date, '%Y-%m') as month,
                SUM(amount) as total_revenue,
                COUNT(*) as total_sessions,
                payment_type,
                COUNT(DISTINCT client_id) as unique_clients
            FROM payments
            WHERE payment_date BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), payment_type
            ORDER BY month
        `, [startDate, endDate]);

        return results;
    }

    // Terapist performans raporu
    async getTherapistPerformance(therapistId, startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                AVG(success_rating) as average_rating,
                COUNT(DISTINCT client_id) as total_clients,
                SUM(CASE WHEN cancelled = 1 THEN 1 ELSE 0 END) as cancelled_sessions
            FROM therapy_sessions
            WHERE therapist_id = ?
            AND session_date BETWEEN ? AND ?
        `, [therapistId, startDate, endDate]);

        return results[0];
    }

    // VR senaryo kullanım analizi
    async getVRScenarioAnalytics(startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                s.scenario_id,
                sc.name as scenario_name,
                COUNT(*) as usage_count,
                AVG(s.success_rating) as average_success,
                AVG(s.duration) as average_duration
            FROM therapy_sessions s
            JOIN vr_scenarios sc ON s.scenario_id = sc.id
            WHERE s.session_date BETWEEN ? AND ?
            GROUP BY s.scenario_id, sc.name
        `, [startDate, endDate]);

        return results;
    }

    // Fobi türü bazında analiz
    async getPhobiaTypeAnalytics(startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                pt.id as phobia_type_id,
                pt.name as phobia_name,
                COUNT(DISTINCT ts.client_id) as total_patients,
                AVG(ts.success_rating) as average_success,
                COUNT(ts.id) as total_sessions
            FROM therapy_sessions ts
            JOIN client_phobia_types cpt ON ts.client_id = cpt.client_id
            JOIN phobia_types pt ON cpt.phobia_type_id = pt.id
            WHERE ts.session_date BETWEEN ? AND ?
            GROUP BY pt.id, pt.name
        `, [startDate, endDate]);

        return results;
    }

    // Danışan demografik analizi
    async getClientDemographics() {
        const [results] = await this.db.execute(`
            SELECT 
                CASE 
                    WHEN age < 18 THEN '0-17'
                    WHEN age BETWEEN 18 AND 24 THEN '18-24'
                    WHEN age BETWEEN 25 AND 34 THEN '25-34'
                    WHEN age BETWEEN 35 AND 44 THEN '35-44'
                    WHEN age BETWEEN 45 AND 54 THEN '45-54'
                    ELSE '55+'
                END as age_group,
                gender,
                COUNT(*) as count
            FROM individual_clients
            GROUP BY age_group, gender
        `);

        return results;
    }
}

module.exports = ReportingService;
