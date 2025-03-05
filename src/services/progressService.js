const moment = require('moment');

class ProgressService {
    constructor(db) {
        this.db = db;
    }

    // Yeni ilerleme kaydı oluştur
    async createProgressEntry(progressData) {
        const {
            clientId,
            sessionId,
            phobiaTypeId,
            anxietyLevel,
            confidenceLevel,
            notes,
            goals,
            exerciseResults
        } = progressData;

        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Ana ilerleme kaydını oluştur
            const [result] = await connection.execute(`
                INSERT INTO progress_tracking (
                    client_id,
                    session_id,
                    phobia_type_id,
                    anxiety_level,
                    confidence_level,
                    notes,
                    tracked_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [clientId, sessionId, phobiaTypeId, anxietyLevel, confidenceLevel, notes]);

            const progressId = result.insertId;

            // Hedefleri kaydet
            if (goals && goals.length > 0) {
                for (const goal of goals) {
                    await connection.execute(`
                        INSERT INTO client_goals (
                            progress_id,
                            description,
                            target_date,
                            status
                        ) VALUES (?, ?, ?, 'in_progress')
                    `, [progressId, goal.description, goal.targetDate]);
                }
            }

            // Egzersiz sonuçlarını kaydet
            if (exerciseResults && exerciseResults.length > 0) {
                for (const exercise of exerciseResults) {
                    await connection.execute(`
                        INSERT INTO exercise_results (
                            progress_id,
                            exercise_type,
                            completion_time,
                            success_rate,
                            difficulty_level,
                            notes
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        progressId,
                        exercise.type,
                        exercise.completionTime,
                        exercise.successRate,
                        exercise.difficultyLevel,
                        exercise.notes
                    ]);
                }
            }

            await connection.commit();
            return progressId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // İlerleme grafiği verilerini getir
    async getProgressGraph(clientId, phobiaTypeId, startDate, endDate) {
        const [results] = await this.db.execute(`
            SELECT 
                DATE(tracked_at) as date,
                anxiety_level,
                confidence_level
            FROM progress_tracking
            WHERE client_id = ?
                AND phobia_type_id = ?
                AND tracked_at BETWEEN ? AND ?
            ORDER BY tracked_at
        `, [clientId, phobiaTypeId, startDate, endDate]);

        return results;
    }

    // Hedef takibi
    async trackGoals(clientId) {
        const [results] = await this.db.execute(`
            SELECT 
                g.*,
                pt.tracked_at,
                pt.anxiety_level,
                pt.confidence_level
            FROM client_goals g
            JOIN progress_tracking pt ON g.progress_id = pt.id
            WHERE pt.client_id = ?
            ORDER BY g.target_date
        `, [clientId]);

        return results;
    }

    // Egzersiz geçmişi
    async getExerciseHistory(clientId, exerciseType = null) {
        let query = `
            SELECT 
                er.*,
                pt.tracked_at,
                pt.anxiety_level
            FROM exercise_results er
            JOIN progress_tracking pt ON er.progress_id = pt.id
            WHERE pt.client_id = ?
        `;
        
        const params = [clientId];
        
        if (exerciseType) {
            query += ' AND er.exercise_type = ?';
            params.push(exerciseType);
        }
        
        query += ' ORDER BY pt.tracked_at DESC';
        
        const [results] = await this.db.execute(query, params);
        return results;
    }

    // Genel ilerleme raporu
    async getProgressReport(clientId) {
        const connection = await this.db.getConnection();
        
        try {
            // Anksiyete seviyesi değişimi
            const [anxietyProgress] = await connection.execute(`
                SELECT 
                    MIN(anxiety_level) as min_anxiety,
                    MAX(anxiety_level) as max_anxiety,
                    AVG(anxiety_level) as avg_anxiety,
                    MIN(tracked_at) as first_session,
                    MAX(tracked_at) as last_session
                FROM progress_tracking
                WHERE client_id = ?
            `, [clientId]);

            // Başarılı egzersiz oranı
            const [exerciseSuccess] = await connection.execute(`
                SELECT 
                    exercise_type,
                    COUNT(*) as total_exercises,
                    AVG(success_rate) as avg_success_rate
                FROM exercise_results er
                JOIN progress_tracking pt ON er.progress_id = pt.id
                WHERE pt.client_id = ?
                GROUP BY exercise_type
            `, [clientId]);

            // Hedef tamamlama oranı
            const [goalCompletion] = await connection.execute(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM client_goals g
                JOIN progress_tracking pt ON g.progress_id = pt.id
                WHERE pt.client_id = ?
                GROUP BY status
            `, [clientId]);

            return {
                anxietyProgress: anxietyProgress[0],
                exerciseSuccess,
                goalCompletion
            };
        } finally {
            connection.release();
        }
    }

    // Önerilen sonraki adımlar
    async getRecommendedNextSteps(clientId) {
        const [lastSession] = await this.db.execute(`
            SELECT 
                pt.*,
                er.difficulty_level,
                er.success_rate
            FROM progress_tracking pt
            LEFT JOIN exercise_results er ON pt.id = er.progress_id
            WHERE pt.client_id = ?
            ORDER BY pt.tracked_at DESC
            LIMIT 1
        `, [clientId]);

        if (lastSession.length === 0) {
            return {
                recommendedDifficulty: 1,
                suggestedExercises: [],
                notes: "İlk seansa başlayın"
            };
        }

        const session = lastSession[0];
        let recommendedDifficulty = session.difficulty_level;
        
        // Başarı oranına göre zorluk seviyesini ayarla
        if (session.success_rate > 80) {
            recommendedDifficulty += 1;
        } else if (session.success_rate < 40) {
            recommendedDifficulty -= 1;
        }

        // Önerilen egzersizleri getir
        const [exercises] = await this.db.execute(`
            SELECT * FROM vr_scenarios
            WHERE difficulty_level = ?
            AND id NOT IN (
                SELECT DISTINCT scenario_id 
                FROM therapy_sessions 
                WHERE client_id = ?
                AND session_date > DATE_SUB(NOW(), INTERVAL 1 MONTH)
            )
            LIMIT 3
        `, [recommendedDifficulty, clientId]);

        return {
            recommendedDifficulty,
            suggestedExercises: exercises,
            notes: `Son seanstaki başarı oranı: ${session.success_rate}%`
        };
    }
}

module.exports = ProgressService;
