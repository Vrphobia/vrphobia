const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Get authorization URL
const getAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
};

// Handle OAuth callback
const handleCallback = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
};

// List upcoming events
const listEvents = async (calendarId = 'primary', maxResults = 10) => {
    try {
        const response = await calendar.events.list({
            calendarId,
            timeMin: new Date().toISOString(),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items;
    } catch (error) {
        console.error('Error listing events:', error);
        throw error;
    }
};

// Create new event
const createEvent = async (eventDetails) => {
    try {
        const event = {
            summary: eventDetails.title,
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.startTime,
                timeZone: 'Europe/Istanbul',
            },
            end: {
                dateTime: eventDetails.endTime,
                timeZone: 'Europe/Istanbul',
            },
            attendees: eventDetails.attendees,
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(7),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1
        });

        return response.data;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

// Update event
const updateEvent = async (eventId, eventDetails) => {
    try {
        const event = {
            summary: eventDetails.title,
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.startTime,
                timeZone: 'Europe/Istanbul',
            },
            end: {
                dateTime: eventDetails.endTime,
                timeZone: 'Europe/Istanbul',
            },
            attendees: eventDetails.attendees
        };

        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: event
        });

        return response.data;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

// Delete event
const deleteEvent = async (eventId) => {
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });
        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};

module.exports = {
    getAuthUrl,
    handleCallback,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
