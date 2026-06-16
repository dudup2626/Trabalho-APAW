-- ============================================
-- StickerSwap 2026 Database Schema
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS stickerswap2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stickerswap2026;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stickers catalog table
CREATE TABLE IF NOT EXISTS stickers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  team VARCHAR(100) NOT NULL,
  position VARCHAR(50),
  rarity ENUM('common', 'rare', 'legendary') DEFAULT 'common',
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_number (number),
  INDEX idx_team (team),
  INDEX idx_rarity (rarity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User stickers collection table
CREATE TABLE IF NOT EXISTS user_stickers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sticker_id INT NOT NULL,
  type ENUM('duplicate', 'missing') NOT NULL,
  quantity INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_sticker (user_id, sticker_id),
  INDEX idx_user_type (user_id, type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  partner_id INT NOT NULL,
  offered_sticker_id INT NOT NULL,
  requested_sticker_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
  message TEXT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offered_sticker_id) REFERENCES stickers(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_sticker_id) REFERENCES stickers(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_partner_status (partner_id, status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trade_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trade (trade_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table (for additional security)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert sample stickers (FIFA World Cup 2026 - partial catalog)
INSERT INTO stickers (number, name, team, position, rarity) VALUES
-- Argentina
('ARG1', 'Lionel Messi', 'Argentina', 'Forward', 'legendary'),
('ARG2', 'Angel Di Maria', 'Argentina', 'Forward', 'rare'),
('ARG3', 'Emiliano Martinez', 'Argentina', 'Goalkeeper', 'rare'),
('ARG4', 'Cristian Romero', 'Argentina', 'Defender', 'common'),
('ARG5', 'Enzo Fernandez', 'Argentina', 'Midfielder', 'common'),

-- Brazil
('BRA1', 'Alisson Becker', 'Brazil', 'Goalkeeper', 'legendary'),
('BRA2', 'Marquinhos', 'Brazil', 'Defender', 'rare'),
('BRA3', 'Neymar Jr', 'Brazil', 'Forward', 'legendary'),
('BRA4', 'Vinicius Jr', 'Brazil', 'Forward', 'rare'),
('BRA5', 'Casemiro', 'Brazil', 'Midfielder', 'common'),

-- France
('FRA1', 'Kylian Mbappe', 'France', 'Forward', 'legendary'),
('FRA2', 'Antoine Griezmann', 'France', 'Forward', 'rare'),
('FRA3', 'Ousmane Dembele', 'France', 'Forward', 'rare'),
('FRA4', 'Hugo Lloris', 'France', 'Goalkeeper', 'common'),
('FRA5', 'Raphael Varane', 'France', 'Defender', 'common'),

-- Germany
('GER1', 'Manuel Neuer', 'Germany', 'Goalkeeper', 'rare'),
('GER2', 'Joshua Kimmich', 'Germany', 'Midfielder', 'rare'),
('GER3', 'Jamal Musiala', 'Germany', 'Midfielder', 'common'),
('GER4', 'Leroy Sane', 'Germany', 'Forward', 'common'),
('GER5', 'Kai Havertz', 'Germany', 'Forward', 'common'),

-- Spain
('ESP1', 'Pedri', 'Spain', 'Midfielder', 'rare'),
('ESP2', 'Gavi', 'Spain', 'Midfielder', 'rare'),
('ESP3', 'Rodri', 'Spain', 'Midfielder', 'common'),
('ESP4', 'Alvaro Morata', 'Spain', 'Forward', 'common'),
('ESP5', 'Dani Carvajal', 'Spain', 'Defender', 'common'),

-- England
('ENG1', 'Harry Kane', 'England', 'Forward', 'rare'),
('ENG2', 'Jude Bellingham', 'England', 'Midfielder', 'rare'),
('ENG3', 'Phil Foden', 'England', 'Forward', 'common'),
('ENG4', 'Declan Rice', 'England', 'Midfielder', 'common'),
('ENG5', 'Bukayo Saka', 'England', 'Forward', 'common'),

-- USA
('USA1', 'Christian Pulisic', 'USA', 'Forward', 'rare'),
('USA2', 'Giovanni Reyna', 'USA', 'Forward', 'common'),
('USA3', 'Weston McKennie', 'USA', 'Midfielder', 'common'),
('USA4', 'Tyler Adams', 'USA', 'Midfielder', 'common'),
('USA5', 'Matt Turner', 'USA', 'Goalkeeper', 'common'),

-- Mexico
('MEX1', 'Hirving Lozano', 'Mexico', 'Forward', 'rare'),
('MEX2', 'Raul Jimenez', 'Mexico', 'Forward', 'common'),
('MEX3', 'Edson Alvarez', 'Mexico', 'Defender', 'common'),
('MEX4', 'Jesus Corona', 'Mexico', 'Forward', 'common'),
('MEX5', 'Guillermo Ochoa', 'Mexico', 'Goalkeeper', 'common'),

-- Canada
('CAN1', 'Alphonso Davies', 'Canada', 'Defender', 'rare'),
('CAN2', 'Jonathan David', 'Canada', 'Forward', 'common'),
('CAN3', 'Cyle Larin', 'Canada', 'Forward', 'common'),
('CAN4', 'Stephen Eustaquio', 'Canada', 'Midfielder', 'common'),
('CAN5', 'Milan Borjan', 'Canada', 'Goalkeeper', 'common'),

-- Portugal
('POR1', 'Cristiano Ronaldo', 'Portugal', 'Forward', 'legendary'),
('POR2', 'Bruno Fernandes', 'Portugal', 'Midfielder', 'rare'),
('POR3', 'Bernardo Silva', 'Portugal', 'Midfielder', 'rare'),
('POR4', 'Joao Felix', 'Portugal', 'Forward', 'common'),
('POR5', 'Ruben Dias', 'Portugal', 'Defender', 'common'),

-- Netherlands
('NED1', 'Virgil van Dijk', 'Netherlands', 'Defender', 'rare'),
('NED2', 'Frenkie de Jong', 'Netherlands', 'Midfielder', 'rare'),
('NED3', 'Memphis Depay', 'Netherlands', 'Forward', 'common'),
('NED4', 'Cody Gakpo', 'Netherlands', 'Forward', 'common'),
('NED5', 'Xavi Simons', 'Netherlands', 'Midfielder', 'common'),

-- Belgium
('BEL1', 'Kevin De Bruyne', 'Belgium', 'Midfielder', 'legendary'),
('BEL2', 'Romelu Lukaku', 'Belgium', 'Forward', 'rare'),
('BEL3', 'Thibaut Courtois', 'Belgium', 'Goalkeeper', 'rare'),
('BEL4', 'Youri Tielemans', 'Belgium', 'Midfielder', 'common'),
('BEL5', 'Leandro Trossard', 'Belgium', 'Forward', 'common'),

-- Italy
('ITA1', 'Gianluigi Donnarumma', 'Italy', 'Goalkeeper', 'rare'),
('ITA2', 'Federico Chiesa', 'Italy', 'Forward', 'rare'),
('ITA3', 'Nicolo Barella', 'Italy', 'Midfielder', 'common'),
('ITA4', 'Ciro Immobile', 'Italy', 'Forward', 'common'),
('ITA5', 'Leonardo Bonucci', 'Italy', 'Defender', 'common'),

-- Croatia
('CRO1', 'Luka Modric', 'Croatia', 'Midfielder', 'legendary'),
('CRO2', 'Mateo Kovacic', 'Croatia', 'Midfielder', 'rare'),
('CRO3', 'Marcelo Brozovic', 'Croatia', 'Midfielder', 'common'),
('CRO4', 'Ivan Perisic', 'Croatia', 'Forward', 'common'),
('CRO5', 'Josko Gvardiol', 'Croatia', 'Defender', 'common'),

-- Uruguay
('URU1', 'Federico Valverde', 'Uruguay', 'Midfielder', 'rare'),
('URU2', 'Darwin Nunez', 'Uruguay', 'Forward', 'common'),
('URU3', 'Ronald Araujo', 'Uruguay', 'Defender', 'common'),
('URU4', 'Rodrigo Bentancur', 'Uruguay', 'Midfielder', 'common'),
('URU5', 'Luis Suarez', 'Uruguay', 'Forward', 'common'),

-- Japan
('JPN1', 'Takefusa Kubo', 'Japan', 'Forward', 'rare'),
('JPN2', 'Kaoru Mitoma', 'Japan', 'Forward', 'common'),
('JPN3', 'Wataru Endo', 'Japan', 'Midfielder', 'common'),
('JPN4', 'Daichi Kamada', 'Japan', 'Midfielder', 'common'),
('JPN5', 'Maya Yoshida', 'Japan', 'Defender', 'common');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for user collection summary
CREATE OR REPLACE VIEW user_collection_summary AS
SELECT 
  u.id as user_id,
  u.name,
  COUNT(DISTINCT CASE WHEN us.type = 'duplicate' THEN us.id END) as duplicate_count,
  COUNT(DISTINCT CASE WHEN us.type = 'missing' THEN us.id END) as missing_count,
  COUNT(DISTINCT us.sticker_id) as total_collected
FROM users u
LEFT JOIN user_stickers us ON u.id = us.user_id
GROUP BY u.id, u.name;

-- View for trade statistics
CREATE OR REPLACE VIEW trade_statistics AS
SELECT 
  u.id as user_id,
  u.name,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' AND (t.user_id = u.id OR t.partner_id = u.id) THEN t.id END) as completed_trades,
  COUNT(DISTINCT CASE WHEN t.status = 'pending' AND t.user_id = u.id THEN t.id END) as pending_sent,
  COUNT(DISTINCT CASE WHEN t.status = 'pending' AND t.partner_id = u.id THEN t.id END) as pending_received
FROM users u
LEFT JOIN trades t ON u.id = t.user_id OR u.id = t.partner_id
GROUP BY u.id, u.name;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure to find trade matches for a user
CREATE PROCEDURE FindTradeMatches(IN p_user_id INT)
BEGIN
  SELECT DISTINCT
    u.id as match_user_id,
    u.name as match_user_name,
    u.city as match_user_city,
    have_s.number as have_sticker_number,
    have_s.name as have_sticker_name,
    want_s.number as want_sticker_number,
    want_s.name as want_sticker_name
  FROM users u
  JOIN user_stickers have_us ON u.id = have_us.user_id AND have_us.type = 'duplicate'
  JOIN stickers have_s ON have_us.sticker_id = have_s.id
  JOIN user_stickers want_us ON u.id = want_us.user_id AND want_us.type = 'missing'
  JOIN stickers want_s ON want_us.sticker_id = want_s.id
  WHERE u.id != p_user_id
  AND have_s.id IN (
    SELECT sticker_id FROM user_stickers WHERE user_id = p_user_id AND type = 'missing'
  )
  AND want_s.id IN (
    SELECT sticker_id FROM user_stickers WHERE user_id = p_user_id AND type = 'duplicate'
  )
  LIMIT 50;
END //

-- Procedure to get user dashboard stats
CREATE PROCEDURE GetUserDashboardStats(IN p_user_id INT)
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'duplicate' THEN quantity ELSE 0 END), 0) as total_duplicates,
    COALESCE(SUM(CASE WHEN type = 'missing' THEN 1 ELSE 0 END), 0) as total_missing,
    (SELECT COUNT(*) FROM trades WHERE (user_id = p_user_id OR partner_id = p_user_id) AND status = 'completed') as completed_trades,
    (SELECT COUNT(*) FROM user_stickers WHERE user_id = p_user_id) as total_stickers
  FROM user_stickers
  WHERE user_id = p_user_id;
END //

DELIMITER ;
