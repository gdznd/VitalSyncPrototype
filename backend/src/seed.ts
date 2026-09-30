import bcrypt from 'bcrypt';
import { pool } from './db.js';

async function seed() {
  try {
    console.log('Seeding database & checking table schemas...');

    // 1. Create vitals table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vitals (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patient_profiles(id) ON DELETE CASCADE,
        heart_rate INTEGER,
        blood_pressure VARCHAR(20),
        spo2 INTEGER,
        temperature NUMERIC(4, 1),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Hash default test password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Create Doctor User
    const doctorUserRes = await pool.query(
      `INSERT INTO users (email, password_hash, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id`,
      ['doctor@vitalsync.com', hashedPassword, 'doctor']
    );

    if (doctorUserRes.rows.length > 0) {
      const doctorUserId = doctorUserRes.rows[0].id;
      await pool.query(
        `INSERT INTO doctor_profiles (user_id, name, specialty, initials, clinic)
         VALUES ($1, $2, $3, $4, $5)`,
        [doctorUserId, 'Dr. Sarah Jenkins', 'Cardiologist', 'SJ', 'City Heart Clinic']
      );
    }

    // 3. Create Patient User
    const patientUserRes = await pool.query(
      `INSERT INTO users (email, password_hash, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id`,
      ['patient@vitalsync.com', hashedPassword, 'patient']
    );

    if (patientUserRes.rows.length > 0) {
      const patientUserId = patientUserRes.rows[0].id;
      await pool.query(
        `INSERT INTO patient_profiles (user_id, unique_id, name, age)
         VALUES ($1, $2, $3, $4)`,
        [patientUserId, 'VS-0001', 'John Doe', 45]
      );
    }

    console.log('Database setup and seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();