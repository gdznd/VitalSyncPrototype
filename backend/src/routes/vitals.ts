import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/vitals/patient/:patientId - Get all vital records for a patient
router.get('/patient/:patientId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `
      SELECT id, patient_id, heart_rate, blood_pressure, spo2, temperature, recorded_at
      FROM vitals
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
    `,
      [patientId]
    );

    res.json({ vitals: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/vitals - Record new vital signs for a patient
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { patient_id, heart_rate, blood_pressure, spo2, temperature } = req.body;

    if (!patient_id) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    const result = await pool.query(
      `
      INSERT INTO vitals (patient_id, heart_rate, blood_pressure, spo2, temperature)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [patient_id, heart_rate, blood_pressure, spo2, temperature]
    );

    res.status(201).json({ vital: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/vitals/patient/:patientId/latest - Get newest single vital record
router.get('/patient/:patientId/latest', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `
      SELECT id, patient_id, heart_rate, blood_pressure, spo2, temperature, recorded_at
      FROM vitals
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No vitals recorded for this patient' });
    }

    res.json({ vital: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;