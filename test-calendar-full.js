require('dotenv').config();
const { getAuthUrl, createEvent } = require('./utils/calendarService');

async function testCalendar() {
    try {
        // 1. Get authorization URL
        const authUrl = getAuthUrl();
        console.log('\n1. Authorization URL (use this if not already authorized):');
        console.log(authUrl);

        // 2. Create a test event (will only work if already authorized)
        console.log('\n2. Attempting to create a test event...');
        
        const eventDetails = {
            title: 'Test Appointment',
            description: 'This is a test appointment created by the system',
            startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            endTime: new Date(Date.now() + 7200000).toISOString(),   // 2 hours from now
            attendees: [{ email: process.env.SMTP_USER }]
        };

        try {
            const event = await createEvent(eventDetails);
            console.log('\nEvent created successfully!');
            console.log('Event details:', {
                id: event.id,
                summary: event.summary,
                start: event.start.dateTime,
                end: event.end.dateTime,
                meetLink: event.hangoutLink
            });
        } catch (error) {
            console.log('\nError creating event:', error.message);
            if (error.message.includes('auth')) {
                console.log('\nPlease authorize the application first using the URL above.');
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testCalendar();
