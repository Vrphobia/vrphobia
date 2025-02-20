const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { checkAuth } = require('../middleware/auth');

// @route   GET api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', checkAuth, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('client', 'name email')
            .populate('therapist', 'name email')
            .sort({ date: -1 });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', checkAuth, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('client', 'name email')
            .populate('therapist', 'name email');

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/appointments
// @desc    Create an appointment
// @access  Private
router.post('/', [
    checkAuth,
    [
        check('client', 'Client is required').not().isEmpty(),
        check('therapist', 'Therapist is required').not().isEmpty(),
        check('date', 'Date is required').not().isEmpty(),
        check('duration', 'Duration is required').isNumeric()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { client, therapist, date, duration, notes } = req.body;

        // Check if therapist exists and is available
        const therapistUser = await User.findOne({ _id: therapist, role: 'therapist' });
        if (!therapistUser) {
            return res.status(400).json({ message: 'Invalid therapist' });
        }

        // Check for scheduling conflicts
        const conflictingAppointment = await Appointment.findOne({
            therapist,
            date: {
                $gte: new Date(date),
                $lt: new Date(new Date(date).getTime() + duration * 60000)
            },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        if (conflictingAppointment) {
            return res.status(400).json({ message: 'Time slot not available' });
        }

        const newAppointment = new Appointment({
            client,
            therapist,
            date,
            duration,
            notes,
            status: 'scheduled'
        });

        const appointment = await newAppointment.save();
        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', checkAuth, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Update fields
        const { date, duration, notes, status } = req.body;
        if (date) appointment.date = date;
        if (duration) appointment.duration = duration;
        if (notes) appointment.notes = notes;
        if (status) appointment.status = status;

        await appointment.save();
        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/appointments/:id
// @desc    Delete appointment
// @access  Private
router.delete('/:id', checkAuth, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Check user authorization
        if (appointment.client.toString() !== req.user.id && 
            req.user.role !== 'admin' && 
            req.user.role !== 'therapist') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await appointment.remove();
        res.json({ msg: 'Appointment removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
