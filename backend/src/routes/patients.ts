import { Router } from 'express';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

async function doctorCanAccessPatient(doctorUserId: number, patientId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM monitoring_relationships mr
       JOIN doctor_profiles dp ON dp.user_id = $2
       WHERE mr.patient_id = $1
         AND (
           mr.managing_doctor_id = dp.id
           OR mr.visibility = 'All Doctors'
           OR (
             mr.visibility = 'Selected Doctors'
             AND dp.id = ANY(mr.selected_doctor_ids)
           )
         )
     ) AS allowed`,
    [patientId, doctorUserId]
  );

  return result.rows[0].allowed;
}

// GET /api/patients - List all patients (Requires doctor role)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    const result = await pool.query(`
      SELECT DISTINCT p.id, p.user_id, p.unique_id, p.name, p.age, u.email, u.created_at
      FROM patient_profiles p
      JOIN users u ON p.user_id = u.id
      JOIN monitoring_relationships mr ON mr.patient_id = p.id
      JOIN doctor_profiles dp ON dp.user_id = $1
      WHERE dp.id = mr.managing_doctor_id
         OR mr.visibility = 'All Doctors'
         OR (
           mr.visibility = 'Selected Doctors'
           AND dp.id = ANY(mr.selected_doctor_ids)
         )
      ORDER BY u.created_at DESC
    `, [req.user.id]);

    res.json({ patients: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/patients/:id - Fetch single patient profile
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ message: 'Invalid patient ID' });
    }
    if (!(await doctorCanAccessPatient(req.user.id, patientId))) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const result = await pool.query(
      `
      SELECT p.id, p.user_id, p.unique_id, p.name, p.age, u.email, u.created_at 
      FROM patient_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `,
      [patientId]
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
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Doctor role required.' });
  }

  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : null;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpConfigured = [smtpHost, smtpUser, smtpPass].every(
    (value) => value && !/^your_|placeholder|example/i.test(value)
  );

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A valid email and patient name are required.' });
  }
  if (!smtpConfigured || !Number.isInteger(smtpPort)) {
    return res.status(503).json({ message: 'Patient invitation email is not configured.' });
  }

  const temporaryPassword = randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  const patientPortalUrl = process.env.PATIENT_PORTAL_URL || 'http://localhost:5174';
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const doctorResult = await client.query(
      'SELECT id FROM doctor_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (doctorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(403).json({ message: 'Doctor profile not found.' });
    }

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, is_temporary_password)
       VALUES ($1, $2, 'patient', TRUE)
       RETURNING id`,
      [email, passwordHash]
    );
    const userId = userResult.rows[0].id;
    const uniqueId = `VS-${String(userId).padStart(4, '0')}`;

    const patientResult = await client.query(
      `INSERT INTO patient_profiles (user_id, unique_id, name, phone, care_focus)
       VALUES ($1, $2, $3, $4, 'General lifestyle care')
       RETURNING id, user_id, unique_id, name, age, phone, care_focus,
                 patient_type, status, priority, follow_up_date, monitoring_active`,
      [userId, uniqueId, name, phone]
    );
    const patient = patientResult.rows[0];

    await client.query(
      `INSERT INTO monitoring_relationships
         (patient_id, managing_doctor_id, visibility, selected_doctor_ids)
       VALUES ($1, $2, 'Assigned Only', ARRAY[]::integer[])`,
      [patient.id, doctorResult.rows[0].id]
    );

    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: email,
      subject: 'Your VitalSync Patient Portal account',
      text: [
        `Hello ${name},`,
        '',
        'Your doctor created a VitalSync Patient Portal account for you.',
        `Login email: ${email}`,
        `Temporary password: ${temporaryPassword}`,
        `Patient Portal: ${patientPortalUrl}`,
        '',
        'Sign in with these credentials and change your temporary password after signing in.',
      ].join('\n'),
    });

    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({
      patient: { ...patient, email },
      message: 'Patient account created and invitation email sent.',
    });
  } catch (err: any) {
    if (transactionStarted) await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A user with this email or patient ID already exists.' });
    }
    console.error('Patient account creation failed:', err);
    return res.status(502).json({ message: 'Could not create the patient account and send its invitation.' });
  } finally {
    client.release();
  }
});

// PUT /api/patients/:id - Update patient profile details
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ message: 'Invalid patient ID' });
    }
    if (!(await doctorCanAccessPatient(req.user.id, patientId))) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { name, age } = req.body;

    if (!name || !age) {
      return res.status(400).json({ message: 'Name and age are required' });
    }

    const result = await pool.query(
      `
      UPDATE patient_profiles
      SET name = $1, age = $2
      WHERE id = $3
      RETURNING *
    `,
      [name, age, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ message: 'Patient updated successfully', patient: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Hard deletion is disabled because patient history must be retained.
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Doctor role required.' });
  }
  return res.status(405).json({ message: 'Patient deletion is disabled; archive monitoring instead.' });
});

export default router;