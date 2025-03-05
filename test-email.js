require('dotenv').config();
const { testEmailConnection, sendEmail } = require('./utils/emailService');

async function testEmail() {
    try {
        // First test the connection
        await testEmailConnection();
        
        // Then send a test email
        await sendEmail(
            process.env.SMTP_USER, // sending to yourself for testing
            'welcomeEmployee',
            { name: 'Test User' }
        );
        
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testEmail();
