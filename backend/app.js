import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import fs from 'fs';
import authRoutes from './authRoutes.js';
import { authenticateToken } from './authMiddleware.js';

// Lire le fichier de configuration JSON
const dbConfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const app = express();
app.use(cors()); // Autorise toutes les origines
app.use(express.json()); // Pour analyser le JSON dans les requêtes

// Routes d'authentification
app.use('/auth', authRoutes);

// Route protégée pour récupérer les idées
app.get('/idees', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id_idee, date_idee, idee, statuts.statut, evaluations.id_note, evaluations.libelle AS libelle_note FROM idees INNER JOIN evaluations ON idees.id_note = evaluations.id_note INNER JOIN statuts ON idees.id_statut = statuts.id_statut ORDER BY idees.date_idee DESC');
        await connection.end();

        res.status(200).json(rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des idées:', error);
        res.status(500).json({ error: `Erreur lors de la récupération des idées: ${error.message}` });
    }
});

// Route pour insérer des données
app.post('/ajouter-idee', async (req, res) => {
    const { idee } = req.body;

    if (!idee || idee.length <= 10) {
        return res.status(400).json({ error: 'L\'idée doit contenir plus de 10 caractères.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO idees (idee) VALUES (?)', [idee]);
        await connection.end();

        res.status(201).json({ message: 'Idée ajoutée avec succès!', id: result.insertId }); // permet de vérifier si l'idée a été ajoutée avec succès
    } catch (error) {
        console.error('Erreur lors de l\'insertion de l\'idée:', error);
        res.status(500).json({ error: `Erreur lors de l'insertion de l'idée: ${error.message}` });
    }
});

// Route pour supprimer une idée
app.delete('/idees/:id', async (req, res) => {
    const { id } = req.params;

    // Vérification de l'identifiant
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Identifiant invalide.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM idees WHERE id_idee = ?', [id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Idée non trouvée.' });
        }

        res.status(200).json({ message: 'Idée supprimée avec succès!' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'idée:', error);
        res.status(500).json({ error: `Erreur lors de la suppression de l'idée: ${error.message}` });
    }
});

// Route pour mettre à jour l'évaluation d'une idée
app.post('/idees/:id/evaluation', async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    // Validation des entrées
    if (!id || isNaN(id) || !note || isNaN(note) || note < 1 || note > 5) {
        return res.status(400).json({ error: 'Données invalides.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('UPDATE idees SET id_note = ? WHERE id_idee = ?', [note, id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Idée non trouvée.' });
        }

        res.status(200).json({ message: 'Évaluation mise à jour avec succès!' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
        res.status(500).json({ error: `Erreur lors de la mise à jour de l'évaluation: ${error.message}` });
    }
});

// Route pour mettre à jour le statut d'une idée
app.post('/idees/:id/statut', async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;

    // Validation des entrées
    if (!id || isNaN(id) || !statut) {
        return res.status(400).json({ error: 'Données invalides.' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('UPDATE idees SET id_statut = ? WHERE id_idee = ?', [statut, id]);
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Idée non trouvée.' });
        }

        res.status(200).json({ message: 'Statut mis à jour avec succès!' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ error: `Erreur lors de la mise à jour du statut: ${error.message}` });
    }
});

app.get('/', (req, res) => {
    res.send('Express js en cours d\'utilisation');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
