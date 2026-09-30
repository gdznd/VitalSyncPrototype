import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/patients - List all patients (Requires doctor role)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    const result = await pool.query(`
      SELECT p.id, p.user_id, p.unique_id, p.name, p.age, u.email, u.created_at 
      FROM patient_profiles p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ patients: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/patients/:id - Fetch single patient profile
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT p.id, p.user_id, p.unique_id, p.name, p.age, u.email, u.created_at 
      FROM patient_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ patient: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/patients - Register a new patient profile (Doctor only)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    const { email, password, name, age, unique_id } = req.body;

    if (!email || !password || !name || !age || !unique_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
      [email, hashedPassword, 'patient']
    );

    const userId = userRes.rows[0].id;

    // Create patient profile
    const patientRes = await pool.query(
      `INSERT INTO patient_profiles (user_id, unique_id, name, age) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, unique_id, name, age]
    );

    res.status(201).json({ patient: patientRes.rows[0] });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or Unique ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;