const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['document', 'image', 'report', 'other'],
        default: 'other'
    },
    tags: [{
        type: String
    }],
    description: {
        type: String
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Create indexes
fileSchema.index({ userId: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ tags: 1 });

module.exports = mongoose.model('File', fileSchema);
