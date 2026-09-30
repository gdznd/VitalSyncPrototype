import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL (vitalsync_db)');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});