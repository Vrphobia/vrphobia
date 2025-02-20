const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const Company = require('../models/Company');
const User = require('../models/User');
const { checkAuth } = require('../middleware/auth');

// @route   GET api/companies
// @desc    Get all companies
// @access  Private
router.get('/', checkAuth, async (req, res) => {
    try {
        const companies = await Company.find();
        res.json(companies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/companies/:id
// @desc    Get company by ID
// @access  Private
router.get('/:id', checkAuth, async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({ msg: 'Company not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && 
            (req.user.role === 'company_admin' && req.user.company.toString() !== company._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(company);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Company not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/companies
// @desc    Create a new company
// @access  Private (Admin only)
router.post('/', [
    checkAuth, 
    checkRole(['admin']),
    [
        check('name', 'Company name is required').not().isEmpty(),
        check('contractStartDate', 'Contract start date is required').not().isEmpty(),
        check('contractEndDate', 'Contract end date is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const company = new Company(req.body);
        await company.save();
        res.json(company);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/companies/:id
// @desc    Update company
// @access  Private (Admin only)
router.put('/:id', [checkAuth, checkRole(['admin'])], async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({ msg: 'Company not found' });
        }

        res.json(company);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/companies/:id/employees
// @desc    Get all employees of a company
// @access  Private (Admin and Company Admin)
router.get('/:id/employees', checkAuth, async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && 
            (req.user.role === 'company_admin' && req.user.company.toString() !== company._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const employees = await User.find({ company: req.params.id })
            .select('-password')
            .sort({ lastName: 1, firstName: 1 });

        res.json(employees);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/companies/:id/employees
// @desc    Add employee to company
// @access  Private (Admin and Company Admin)
router.post('/:id/employees', [
    checkAuth,
    [
        check('email', 'Valid email is required').isEmail(),
        check('firstName', 'First name is required').not().isEmpty(),
        check('lastName', 'Last name is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && 
            (req.user.role === 'company_admin' && req.user.company.toString() !== company._id.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { email, firstName, lastName, position, department } = req.body;

        // Check if employee already exists
        let employee = await User.findOne({ email });
        if (employee) {
            return res.status(400).json({ message: 'Employee already exists' });
        }

        // Create new employee
        employee = new User({
            email,
            firstName,
            lastName,
            position,
            department,
            company: req.params.id,
            role: 'employee',
            // Generate temporary password
            password: Math.random().toString(36).slice(-8)
        });

        await employee.save();

        // Update company employee count
        company.employeeCount += 1;
        await company.save();

        // TODO: Send welcome email with temporary password

        res.json(employee);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
