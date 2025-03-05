require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/esp-portal', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('Successfully connected to MongoDB!');
        
        // Try to create a test document
        const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
        await TestModel.create({ name: 'test' });
        console.log('Successfully created a test document!');
        
        // Clean up
        await TestModel.deleteMany({});
        console.log('Successfully cleaned up test documents!');
        
        await mongoose.connection.close();
        console.log('Connection closed.');
        
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
    }
}

testMongoConnection();
