/**
 * StickerSwap 2026 - Express Server (Demo Version)
 * Backend API for the sticker trading platform (works without database)
 */

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory data store (for demo purposes)
const users = [];
const userStickers = [];
const trades = [];

// Catalog data
const catalog = [
  { id: 1, number: 'BRA1', name: 'Alisson Becker', team: 'Brazil', rarity: 'legendary' },
  { id: 2, number: 'BRA2', name: 'Marquinhos', team: 'Brazil', rarity: 'rare' },
  { id: 3, number: 'BRA3', name: 'Neymar Jr', team: 'Brazil', rarity: 'legendary' },
  { id: 4, number: 'ARG1', name: 'Lionel Messi', team: 'Argentina', rarity: 'legendary' },
  { id: 5, number: 'ARG2', name: 'Angel Di Maria', team: 'Argentina', rarity: 'rare' },
  { id: 6, number: 'FRA1', name: 'Kylian Mbappe', team: 'France', rarity: 'legendary' },
  { id: 7, number: 'FRA2', name: 'Antoine Griezmann', team: 'France', rarity: 'rare' },
  { id: 8, number: 'GER1', name: 'Manuel Neuer', team: 'Germany', rarity: 'rare' },
  { id: 9, number: 'ESP1', name: 'Pedri', team: 'Spain', rarity: 'rare' },
  { id: 10, number: 'ENG1', name: 'Harry Kane', team: 'England', rarity: 'rare' },
  { id: 11, number: 'POR1', name: 'Cristiano Ronaldo', team: 'Portugal', rarity: 'legendary' },
  { id: 12, number: 'USA1', name: 'Christian Pulisic', team: 'USA', rarity: 'rare' },
];

const tradeMatches = [
  { id: 1, user: 'Carlos Silva', city: 'São Paulo', avatar: 'CS', has: { number: 'BRA3', name: 'Neymar Jr' }, wants: { number: 'ARG1', name: 'Messi' }, compatibility: 95 },
  { id: 2, user: 'Maria Garcia', city: 'Buenos Aires', avatar: 'MG', has: { number: 'ARG1', name: 'Messi' }, wants: { number: 'FRA1', name: 'Mbappe' }, compatibility: 88 },
  { id: 3, user: 'John Smith', city: 'London', avatar: 'JS', has: { number: 'ENG1', name: 'Kane' }, wants: { number: 'BRA1', name: 'Alisson' }, compatibility: 82 },
  { id: 4, user: 'Emma Wilson', city: 'Paris', avatar: 'EW', has: { number: 'FRA3', name: 'Dembele' }, wants: { number: 'GER1', name: 'Neuer' }, compatibility: 76 },
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

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
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      city: city || null,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    
    // Generate token
    const token = jwt.sign(
      { userId: newUser.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name,
        email,
        city: newUser.city
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
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
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
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    city: user.city,
    memberSince: user.created_at
  });
});

// ============================================
// USER ROUTES
// ============================================

// Update profile
app.put('/api/users/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { name, email, city, bio } = req.body;
  user.name = name || user.name;
  user.email = email || user.email;
  user.city = city !== undefined ? city : user.city;
  user.bio = bio !== undefined ? bio : user.bio;
  user.updated_at = new Date().toISOString();
  
  res.json({ success: true, message: 'Profile updated successfully' });
});

// ============================================
// STICKER ROUTES
// ============================================

// Get user's stickers
app.get('/api/stickers', authenticateToken, (req, res) => {
  const { type } = req.query;
  let stickers = userStickers.filter(s => s.user_id === req.userId);
  
  if (type && ['duplicate', 'missing'].includes(type)) {
    stickers = stickers.filter(s => s.type === type);
  }
  
  // Enrich with catalog data
  const enriched = stickers.map(s => {
    const catalogItem = catalog.find(c => c.id === s.sticker_id);
    return {
      ...s,
      ...catalogItem
    };
  });
  
  res.json(enriched);
});

// Add sticker to collection
app.post('/api/stickers', authenticateToken, (req, res) => {
  const { stickerId, type, quantity } = req.body;
  
  // Check if already exists
  const existingIndex = userStickers.findIndex(
    s => s.user_id === req.userId && s.sticker_id === parseInt(stickerId)
  );
  
  if (existingIndex > -1) {
    userStickers[existingIndex].type = type;
    userStickers[existingIndex].quantity = quantity || 1;
    return res.json({ success: true, message: 'Sticker updated successfully' });
  }
  
  // Add new
  const newSticker = {
    id: userStickers.length + 1,
    user_id: req.userId,
    sticker_id: parseInt(stickerId),
    type,
    quantity: quantity || 1
  };
  
  userStickers.push(newSticker);
  
  res.status(201).json({
    success: true,
    message: 'Sticker added successfully',
    id: newSticker.id
  });
});

// Update sticker
app.put('/api/stickers/:id', authenticateToken, (req, res) => {
  const { type, quantity } = req.body;
  const sticker = userStickers.find(s => s.id === parseInt(req.params.id) && s.user_id === req.userId);
  
  if (!sticker) {
    return res.status(404).json({ error: 'Sticker not found' });
  }
  
  sticker.type = type;
  sticker.quantity = quantity;
  
  res.json({ success: true, message: 'Sticker updated successfully' });
});

// Delete sticker
app.delete('/api/stickers/:id', authenticateToken, (req, res) => {
  const index = userStickers.findIndex(
    s => s.id === parseInt(req.params.id) && s.user_id === req.userId
  );
  
  if (index === -1) {
    return res.status(404).json({ error: 'Sticker not found' });
  }
  
  userStickers.splice(index, 1);
  res.json({ success: true, message: 'Sticker deleted successfully' });
});

// ============================================
// CATALOG ROUTES
// ============================================

// Get full catalog
app.get('/api/catalog', (req, res) => {
  const { country, search } = req.query;
  
  let result = [...catalog];
  
  if (country) {
    result = result.filter(s => s.team.toLowerCase() === country.toLowerCase());
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.number.toLowerCase().includes(searchLower) ||
      s.team.toLowerCase().includes(searchLower)
    );
  }
  
  res.json(result);
});

// Get single sticker
app.get('/api/catalog/:id', (req, res) => {
  const sticker = catalog.find(s => s.id === parseInt(req.params.id));
  
  if (!sticker) {
    return res.status(404).json({ error: 'Sticker not found' });
  }
  
  res.json(sticker);
});

// ============================================
// TRADE ROUTES
// ============================================

// Get trade matches
app.get('/api/trades', authenticateToken, (req, res) => {
  res.json(tradeMatches);
});

// ============================================
// STATS ROUTES
// ============================================

// Get user stats
app.get('/api/stats', authenticateToken, (req, res) => {
  const userStk = userStickers.filter(s => s.user_id === req.userId);
  const duplicates = userStk.filter(s => s.type === 'duplicate').reduce((sum, s) => sum + s.quantity, 0);
  const missing = userStk.filter(s => s.type === 'missing').length;
  
  res.json({
    duplicates,
    missing,
    trades: 0
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// PAGE ROUTES
// ============================================

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/register.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/dashboard.html'));
});

app.get('/album', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/album.html'));
});

app.get('/album.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/album.html'));
});

app.get('/sticker-add', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/sticker-add.html'));
});

app.get('/sticker-add.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/sticker-add.html'));
});

app.get('/trades', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/trades.html'));
});

app.get('/trades.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/trades.html'));
});

app.get('/catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/catalog.html'));
});

app.get('/catalog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/catalog.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/profile.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/profile.html'));
});

app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/pages/error.html'));
});

app.get('/error.html', (req, res) => {
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
