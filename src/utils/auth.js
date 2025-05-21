// modules/auth.js
const crypto = require('crypto');

const saltLength = 16;
const iterations = 100000;
const keyLength = 64;
const digest = 'sha512';

function hashPassword(password) {
    const salt = crypto.randomBytes(saltLength).toString('hex'); // Gera um salt aleatório
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');
    return { salt, hash };
}

function verifyPassword(password, salt, hash) {
    const hashToVerify = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');
    return hash === hashToVerify;
}

module.exports = {
    hashPassword,
    verifyPassword,
};
