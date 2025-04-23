// testConnection.js
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

async function testDb() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connexion à la BDD réussie');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Échec de la connexion à la BDD', err);
    process.exit(1);
  }
}

testDb();