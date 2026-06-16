/**
 * StickerSwap 2026 - Express Server
 * Backend API for the sticker trading platform
 */

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.static('views/pages'));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stickerswap2026',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
};

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, city } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, city, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, city || null]
    );
    
    // Generate token
    const token = jwt.sign(
      { userId: result.insertId, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name,
        email,
        city
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const [users] = await pool.execute(
      'SELECT id, name, email, password, city, created_at FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        city: user.city,
        memberSince: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, city, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      memberSince: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER ROUTES
// ============================================

// Update profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, city, bio } = req.body;
    
    await pool.execute(
      'UPDATE users SET name = ?, email = ?, city = ?, bio = ?, updated_at = NOW() WHERE id = ?',
      [name, email, city, bio, req.userId]
    );
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.userId]
    );
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account
app.delete('/api/users/account', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM user_stickers WHERE user_id = ?', [req.userId]);
    await pool.execute('DELETE FROM trades WHERE user_id = ?', [req.userId]);
    await pool.execute('DELETE FROM users WHERE id = ?', [req.userId]);
    
    res.clearCookie('token');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STICKER ROUTES
// ============================================

// Get user's stickers
app.get('/api/stickers', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = `
      SELECT us.id, s.number, s.name, s.team, s.rarity, us.type, us.quantity, us.created_at
      FROM user_stickers us
      JOIN stickers s ON us.sticker_id = s.id
      WHERE us.user_id = ?
    `;
    
    const params = [req.userId];
    
    if (type && ['duplicate', 'missing'].includes(type)) {
      query += ' AND us.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY us.created_at DESC';
    
    const [stickers] = await pool.execute(query, params);
    
    res.json(stickers);
  } catch (error) {
    console.error('Get stickers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add sticker to collection
app.post('/api/stickers', authenticateToken, async (req, res) => {
  try {
    const { stickerId, type, quantity } = req.body;
    
    // Check if already exists
    const [existing] = await pool.execute(
      'SELECT id FROM user_stickers WHERE user_id = ? AND sticker_id = ?',
      [req.userId, stickerId]
    );
    
    if (existing.length > 0) {
      // Update existing
      await pool.execute(
        'UPDATE user_stickers SET type = ?, quantity = ? WHERE id = ?',
        [type, quantity || 1, existing[0].id]
      );
      
      return res.json({ success: true, message: 'Sticker updated successfully' });
    }
    
    // Insert new
    const [result] = await pool.execute(
      'INSERT INTO user_stickers (user_id, sticker_id, type, quantity, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.userId, stickerId, type, quantity || 1]
    );
    
    res.status(201).json({
      success: true,
      message: 'Sticker added successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Add sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sticker
app.put('/api/stickers/:id', authenticateToken, async (req, res) => {
  try {
    const { type, quantity } = req.body;
    
    await pool.execute(
      'UPDATE user_stickers SET type = ?, quantity = ? WHERE id = ? AND user_id = ?',
      [type, quantity, req.params.id, req.userId]
    );
    
    res.json({ success: true, message: 'Sticker updated successfully' });
  } catch (error) {
    console.error('Update sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sticker
app.delete('/api/stickers/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM user_stickers WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    
    res.json({ success: true, message: 'Sticker deleted successfully' });
  } catch (error) {
    console.error('Delete sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CATALOG ROUTES
// ============================================

// Get full catalog
app.get('/api/catalog', async (req, res) => {
  try {
    const { country, search } = req.query;
    
    let query = 'SELECT id, number, name, team, rarity FROM stickers WHERE 1=1';
    const params = [];
    
    if (country) {
      query += ' AND team = ?';
      params.push(country);
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY number ASC';
    
    const [stickers] = await pool.execute(query, params);
    
    res.json(stickers);
  } catch (error) {
    console.error('Get catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single sticker
app.get('/api/catalog/:id', async (req, res) => {
  try {
    const [stickers] = await pool.execute(
      'SELECT id, number, name, team, rarity FROM stickers WHERE id = ?',
      [req.params.id]
    );
    
    if (stickers.length === 0) {
      return res.status(404).json({ error: 'Sticker not found' });
    }
    
    res.json(stickers[0]);
  } catch (error) {
    console.error('Get sticker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TRADE ROUTES
// ============================================

// Get trade matches
app.get('/api/trades', authenticateToken, async (req, res) => {
  try {
    // Get user's missing stickers
    const [missingStickers] = await pool.execute(
      'SELECT s.id, s.number, s.name FROM user_stickers us JOIN stickers s ON us.sticker_id = s.id WHERE us.user_id = ? AND us.type = "missing"',
      [req.userId]
    );
    
    // Get user's duplicate stickers
    const [duplicateStickers] = await pool.execute(
      'SELECT s.id, s.number, s.name FROM user_stickers us JOIN stickers s ON us.sticker_id = s.id WHERE us.user_id = ? AND us.type = "duplicate"',
      [req.userId]
    );
    
    const missingIds = missingStickers.map(s => s.id);
    const duplicateIds = duplicateStickers.map(s => s.id);
    
    if (missingIds.length === 0 || duplicateIds.length === 0) {
      return res.json([]);
    }
    
    // Find matching users
    const [matches] = await pool.execute(
      `
      SELECT DISTINCT
        u.id,
        u.name,
        u.city,
        have_s.number as have_number,
        have_s.name as have_name,
        want_s.number as want_number,
        want_s.name as want_name
      FROM users u
      JOIN user_stickers have_us ON u.id = have_us.user_id AND have_us.type = 'duplicate' AND have_us.sticker_id IN (${missingIds.map(() => '?').join(',')})
      JOIN stickers have_s ON have_us.sticker_id = have_s.id
      JOIN user_stickers want_us ON u.id = want_us.user_id AND want_us.type = 'missing' AND want_us.sticker_id IN (${duplicateIds.map(() => '?').join(',')})
      JOIN stickers want_s ON want_us.sticker_id = want_s.id
      WHERE u.id != ?
      LIMIT 20
      `,
      [...missingIds, ...duplicateIds, req.userId]
    );
    
    // Format response
    const formattedMatches = matches.map(match => ({
      id: match.id,
      user: match.name,
      city: match.city || 'Unknown',
      avatar: match.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      has: {
        number: match.have_number,
        name: match.have_name
      },
      wants: {
        number: match.want_number,
        name: match.want_name
      },
      compatibility: Math.floor(Math.random() * 20) + 80 // Simulated for demo
    }));
    
    res.json(formattedMatches);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STATS ROUTES
// ============================================

// Get user stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    // Get counts
    const [duplicateResult] = await pool.execute(
      'SELECT SUM(quantity) as count FROM user_stickers WHERE user_id = ? AND type = "duplicate"',
      [req.userId]
    );
    
    const [missingResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_stickers WHERE user_id = ? AND type = "missing"',
      [req.userId]
    );
    
    const [tradesResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM trades WHERE (user_id = ? OR partner_id = ?) AND status = "completed"',
      [req.userId, req.userId]
    );
    
    res.json({
      duplicates: duplicateResult[0].count || 0,
      missing: missingResult[0].count || 0,
      trades: tradesResult[0].count || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ============================================
// PAGE ROUTES (SPA FALLBACK)
// ============================================

// Serve specific pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/dashboard.html'));
});

app.get('/album', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/album.html'));
});

app.get('/sticker-add', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/sticker-add.html'));
});

app.get('/trades', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/trades.html'));
});

app.get('/catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/catalog.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/profile.html'));
});

// Error page
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/error.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views/pages/404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StickerSwap 2026 server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
