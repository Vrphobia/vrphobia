const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = '123456'; // Basit bir şifre kullanalım test için
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
}

hashPassword();
