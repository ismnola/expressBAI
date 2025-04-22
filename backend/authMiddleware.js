import jwt from 'jsonwebtoken';

// Middleware pour vérifier le token
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Accès refusé. Aucun token fourni.' });
    }

    jwt.verify(token, 'SECRET_KEY', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide.' });
        }
        req.user = user;
        next();
    });
}
