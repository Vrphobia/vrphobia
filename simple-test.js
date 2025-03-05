const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test başarılı!' });
});

// Sunucuyu başlat
const port = 3002;
app.listen(port, () => {
    console.log(`Test sunucusu çalışıyor: http://localhost:${port}`);
});
