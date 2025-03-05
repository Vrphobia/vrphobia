const express = require('express');
const router = express.Router();
const ProgressService = require('../services/progressService');
const { authenticateToken } = require('../middleware/auth');

// Middleware to initialize progress service
router.use((req, res, next) => {
    req.progressService = new ProgressService(req.db);
    next();
});

// Yeni ilerleme kaydı oluştur
router.post('/', authenticateToken, async (req, res) => {
    try {
        const progressData = {
            clientId: req.body.clientId,
            sessionId: req.body.sessionId,
            phobiaTypeId: req.body.phobiaTypeId,
            anxietyLevel: req.body.anxietyLevel,
            confidenceLevel: req.body.confidenceLevel,
            notes: req.body.notes,
            goals: req.body.goals,
            exerciseResults: req.body.exerciseResults
        };

        const progressId = await req.progressService.createProgressEntry(progressData);
        
        res.status(201).json({
            message: 'İlerleme kaydı başarıyla oluşturuldu',
            progressId
        });
    } catch (error) {
        console.error('Error creating progress entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// İlerleme grafiği verilerini getir
router.get('/graph/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { phobiaTypeId, startDate, endDate } = req.query;

        const data = await req.progressService.getProgressGraph(
            clientId,
            phobiaTypeId,
            startDate,
            endDate
        );

        res.json(data);
    } catch (error) {
        console.error('Error fetching progress graph:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Hedef takibi
router.get('/goals/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const goals = await req.progressService.trackGoals(clientId);
        res.json(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Egzersiz geçmişi
router.get('/exercises/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { exerciseType } = req.query;

        const history = await req.progressService.getExerciseHistory(
            clientId,
            exerciseType
        );

        res.json(history);
    } catch (error) {
        console.error('Error fetching exercise history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Genel ilerleme raporu
router.get('/report/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const report = await req.progressService.getProgressReport(clientId);
        res.json(report);
    } catch (error) {
        console.error('Error fetching progress report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Önerilen sonraki adımlar
router.get('/recommendations/:clientId', authenticateToken, async (req, res) => {
    try {
        const { clientId } = req.params;
        const recommendations = await req.progressService.getRecommendedNextSteps(clientId);
        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Hedef güncelle
router.put('/goals/:goalId', authenticateToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        const { status, completionNotes } = req.body;

        await req.db.execute(`
            UPDATE client_goals 
            SET 
                status = ?,
                completion_notes = ?,
                completed_at = CASE WHEN status = 'completed' THEN NOW() ELSE NULL END
            WHERE id = ?
        `, [status, completionNotes, goalId]);

        res.json({ message: 'Hedef başarıyla güncellendi' });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
