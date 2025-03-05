const express = require('express');
const router = express.Router();

router.get('/individual-clients', async (req, res) => {
    try {
        const [rows] = await req.db.execute(`
            SELECT 
                ic.*,
                GROUP_CONCAT(DISTINCT pt.type_name) as phobia_types,
                GROUP_CONCAT(DISTINCT s.scenario_name) as scenarios
            FROM individual_clients ic
            LEFT JOIN client_phobia_types cpt ON ic.id = cpt.client_id
            LEFT JOIN phobia_types pt ON cpt.phobia_type_id = pt.id
            LEFT JOIN client_scenarios cs ON ic.id = cs.client_id
            LEFT JOIN scenarios s ON cs.scenario_id = s.id
            GROUP BY ic.id
            ORDER BY ic.created_at DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching individual clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/corporate-clients', async (req, res) => {
    try {
        const [rows] = await req.db.execute(`
            SELECT * FROM corporate_clients
            ORDER BY created_at DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching corporate clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/individual-clients', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            age,
            gender,
            occupation,
            phobia_types,
            preferred_scenarios
        } = req.body;

        const [result] = await req.db.execute(
            'INSERT INTO individual_clients (name, email, phone, age, gender, occupation) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, phone, age, gender, occupation]
        );

        const clientId = result.insertId;

        if (phobia_types && phobia_types.length > 0) {
            for (const phobiaTypeId of phobia_types) {
                await req.db.execute(
                    'INSERT INTO client_phobia_types (client_id, phobia_type_id) VALUES (?, ?)',
                    [clientId, phobiaTypeId]
                );
            }
        }

        if (preferred_scenarios && preferred_scenarios.length > 0) {
            for (const scenarioId of preferred_scenarios) {
                await req.db.execute(
                    'INSERT INTO client_scenarios (client_id, scenario_id) VALUES (?, ?)',
                    [clientId, scenarioId]
                );
            }
        }

        res.status(201).json({ message: 'Individual client created successfully', clientId });
    } catch (error) {
        console.error('Error creating individual client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/corporate-clients', async (req, res) => {
    try {
        const {
            company_name,
            contact_person,
            email,
            phone,
            address,
            employee_count,
            industry
        } = req.body;

        const [result] = await req.db.execute(
            'INSERT INTO corporate_clients (company_name, contact_person, email, phone, address, employee_count, industry) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [company_name, contact_person, email, phone, address, employee_count, industry]
        );

        res.status(201).json({ 
            message: 'Corporate client created successfully',
            clientId: result.insertId
        });
    } catch (error) {
        console.error('Error creating corporate client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
