import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import authRoutes from './authRoutes.js';
import { authenticateToken } from './authMiddleware.js';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API Express en ligne 🚀');
});
// GET idées (protégé)
app.get('/idees', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT id_idee, date_idee, idee, statuts.statut, evaluations.id_note, evaluations.libelle AS libelle_note 
       FROM idees 
       INNER JOIN evaluations ON idees.id_note = evaluations.id_note 
       INNER JOIN statuts ON idees.id_statut = statuts.id_statut 
       ORDER BY idees.date_idee DESC`
    );
    await connection.end();
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des idées:', error);
    res.status(500).json({ error: `Erreur: ${error.message}` });
  }
});

// POST idée
app.post('/ajouter-idee', async (req, res) => {
  const { idee } = req.body;

  if (!idee || idee.length <= 10) {
    return res.status(400).json({ error: 'L\'idée doit contenir plus de 10 caractères.' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute('INSERT INTO idees (idee) VALUES (?)', [idee]);
    await connection.end();
    res.status(201).json({ message: 'Idée ajoutée avec succès!', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'insertion:', error);
    res.status(500).json({ error: `Erreur: ${error.message}` });
  }
});

// DELETE idée
app.delete('/idees/:id', async (req, res) => {
  const { id } = req.params;

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
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: `Erreur: ${error.message}` });
  }
});

// POST évaluation
app.post('/idees/:id/evaluation', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

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
    console.error('Erreur mise à jour évaluation:', error);
    res.status(500).json({ error: `Erreur: ${error.message}` });
  }
});

// POST statut
app.post('/idees/:id/statut', async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

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
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ error: `Erreur: ${error.message}` });
  }
});

app.get('/', (req, res) => {
  res.send('Express js en cours d\'utilisation');
});

export default app;
