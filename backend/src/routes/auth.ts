import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vitalsync_super_secret_jwt_key_2026';

async function getAuthUser(userId: number) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.is_temporary_password, u.created_at,
            d.name, d.specialty, d.initials, d.display_color
     FROM users u
     LEFT JOIN doctor_profiles d ON d.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const authUser = await getAuthUser(user.id);

    res.json({
      token,
      user: authUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me (Protected Route)
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await getAuthUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ message: 'Patient account required.' });
  }

  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  try {
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND role = $2',
      [req.user.id, 'patient']
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient account not found.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, is_temporary_password = FALSE
       WHERE id = $2 AND role = $3`,
      [passwordHash, req.user.id, 'patient']
    );

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not update password.' });
  }
});

export default router;