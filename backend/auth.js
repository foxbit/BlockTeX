const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET obrigatório em produção');
}
const SECRET_KEY = process.env.JWT_SECRET || 'blocktex-secret-random-key';

function authenticate(req, res, next) {
    // Allows OPTIONS requests (CORS preflight) without token
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

module.exports = { authenticate, SECRET_KEY };
