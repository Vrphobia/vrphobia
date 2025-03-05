const express = require('express');
const app = express();
const port = 3002;

app.get('/', (req, res) => {
    res.json({ message: 'Merhaba! Sunucu çalışıyor!' });
});

app.listen(port, () => {
    console.log(`Sunucu şu adreste çalışıyor: http://localhost:${port}`);
});
