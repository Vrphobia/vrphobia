require('dotenv').config();
const { getAuthUrl } = require('./utils/calendarService');

// Get the authorization URL
const authUrl = getAuthUrl();
console.log('Please visit this URL to authorize the application:');
console.log(authUrl);
