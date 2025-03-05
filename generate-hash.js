const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'Vrphobia123*';
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
}

generateHash();
