import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import fs from 'fs';


const router = express.Router();
const dbConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const SECRET_KEY = 'SECRET_KEY'; 

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Stocke l'info de l'utilisateur pour les prochaines requêtes
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide ou expiré.' });
    }
};


// Inscription
router.post('/register', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login et mot de passe requis.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'INSERT INTO utilisateurs (log_in, pass_word) VALUES (?, ?)', 
            [login, hashedPassword]
        );
        await connection.end();

        res.status(201).json({ message: 'Utilisateur créé avec succès!', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: `Erreur lors de l'inscription: ${error.message}` });
    }
});



// Connexion
router.post('/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login et mot de passe requis.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT * FROM utilisateurs WHERE log_in = ?', [login]);
        await connection.end();

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utilisateur non trouvé.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.pass_word);

        if (!isMatch) {
            return res.status(401).json({ error: 'Mot de passe incorrect.' });
        }

        const token = jwt.sign({ id: user.id, login: user.log_in }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ message: 'Connexion réussie!', token, user: { id: user.id, login: user.log_in } });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ error: `Erreur lors de la connexion: ${error.message}` });
    }
});



router.get('/', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT id, log_in FROM utilisateurs WHERE id = ?', [req.user.id]);
        await connection.end();

        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }

        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: `Erreur lors de la récupération des infos: ${error.message}` });
    }
});

export default router;
