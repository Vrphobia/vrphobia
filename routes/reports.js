const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const Company = require('../models/Company');
const { checkAuth, checkPermission } = require('../middleware/auth');

// Get overall statistics
router.get('/statistics', checkAuth, async (req, res) => {
    try {
        const { startDate, endDate, companyId, programType, therapistId } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (companyId) query.companyId = companyId;
        if (programType) query.programType = programType;
        if (therapistId) query.therapistId = therapistId;

        const stats = await Session.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    avgSatisfaction: { $avg: '$satisfactionScore' },
                    attendanceRate: {
                        $avg: {
                            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                totalSessions: 0,
                avgDuration: 0,
                avgSatisfaction: 0,
                attendanceRate: 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get session distribution
router.get('/session-distribution', checkAuth, async (req, res) => {
    try {
        const { startDate, endDate, companyId } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (companyId) query.companyId = companyId;

        const distribution = await Session.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        dayOfWeek: { $dayOfWeek: '$date' },
                        programType: '$programType'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.dayOfWeek',
                    programs: {
                        $push: {
                            type: '$_id.programType',
                            count: '$count'
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({ success: true, data: distribution });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get therapist performance
router.get('/therapist-performance', checkAuth, checkPermission('view_reports'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const performance = await Session.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$therapistId',
                    totalSessions: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    avgSatisfaction: { $avg: '$satisfactionScore' },
                    completionRate: {
                        $avg: {
                            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'therapist'
                }
            },
            { $unwind: '$therapist' },
            {
                $project: {
                    name: { $concat: ['$therapist.firstName', ' ', '$therapist.lastName'] },
                    totalSessions: 1,
                    avgDuration: 1,
                    avgSatisfaction: 1,
                    completionRate: 1,
                    performanceScore: {
                        $multiply: [
                            { $avg: ['$avgSatisfaction', '$completionRate'] },
                            100
                        ]
                    }
                }
            }
        ]);

        res.json({ success: true, data: performance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get client analysis
router.get('/client-analysis', checkAuth, checkPermission('view_reports'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const analysis = await Company.aggregate([
            {
                $lookup: {
                    from: 'sessions',
                    localField: '_id',
                    foreignField: 'companyId',
                    as: 'sessions'
                }
            },
            {
                $project: {
                    name: 1,
                    activeEmployees: 1,
                    participationRate: {
                        $divide: [
                            { $size: '$sessions' },
                            '$totalEmployees'
                        ]
                    },
                    avgSessions: {
                        $divide: [
                            { $size: '$sessions' },
                            '$activeEmployees'
                        ]
                    },
                    satisfaction: {
                        $avg: '$sessions.satisfactionScore'
                    },
                    trend: {
                        $subtract: [
                            { $avg: '$sessions.satisfactionScore' },
                            { $avg: '$previousSessions.satisfactionScore' }
                        ]
                    }
                }
            }
        ]);

        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get financial report
router.get('/financial', checkAuth, checkPermission('view_financial_reports'), async (req, res) => {
    try {
        const { startDate, endDate, companyId } = req.query;
        
        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (companyId) query.companyId = companyId;

        const financial = await Session.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$programType',
                    revenue: { $sum: '$cost' },
                    sessionCount: { $sum: 1 },
                    avgRevenue: { $avg: '$cost' },
                    growth: {
                        $divide: [
                            { $subtract: [
                                { $sum: '$cost' },
                                { $sum: '$previousCost' }
                            ]},
                            { $sum: '$previousCost' }
                        ]
                    }
                }
            }
        ]);

        res.json({ success: true, data: financial });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export reports
router.post('/export', checkAuth, checkPermission('export_reports'), async (req, res) => {
    try {
        const { format, reportType, filters } = req.body;
        
        // Get report data based on type and filters
        const reportData = await generateReport(reportType, filters);
        
        // Generate export file
        const exportFile = await generateExportFile(format, reportData);
        
        res.json({
            success: true,
            data: {
                fileUrl: exportFile.url,
                fileName: exportFile.fileName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper functions
async function generateReport(type, filters) {
    // Implement report generation logic
}

async function generateExportFile(format, data) {
    // Implement file export logic
}

module.exports = router;
