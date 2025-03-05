const express = require('express');
const router = express.Router();
const ReportingService = require('../services/reportingService');
const { authenticateToken } = require('../middleware/auth');

// Middleware to initialize reporting service
router.use((req, res, next) => {
    req.reportingService = new ReportingService(req.db);
    next();
});

// Tedavi başarı oranları
router.get('/therapy-success', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getTherapySuccessRates(startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting therapy success rates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Danışan ilerleme raporu
router.get('/client-progress/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getClientProgress(clientId, startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting client progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Finansal raporlar
router.get('/financial', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getFinancialReport(startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting financial report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Terapist performans raporu
router.get('/therapist-performance/:therapistId', authenticateToken, async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getTherapistPerformance(therapistId, startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting therapist performance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// VR senaryo analizi
router.get('/vr-scenarios', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getVRScenarioAnalytics(startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting VR scenario analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fobi türü analizi
router.get('/phobia-types', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const results = await req.reportingService.getPhobiaTypeAnalytics(startDate, endDate);
        res.json(results);
    } catch (error) {
        console.error('Error getting phobia type analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Danışan demografik analizi
router.get('/demographics', authenticateToken, async (req, res) => {
    try {
        const results = await req.reportingService.getClientDemographics();
        res.json(results);
    } catch (error) {
        console.error('Error getting client demographics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
