CREATE DATABASE IF NOT EXISTS qrsessionsystem;
USE qrsessionsystem;

-- 1. users tablosu
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. login_sessions tablosu (QR Tokenları için)
CREATE TABLE IF NOT EXISTS login_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  qr_token VARCHAR(255) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. active_sessions tablosu (Giriş yapan soketler/kullanıcılar için)
CREATE TABLE IF NOT EXISTS active_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  socket_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test için dummy bir kullanıcı ekleyelim (şifre: 123456 - hash'siz veya düz deneme amaçlı, ama gerçekte bcrypt kullanılır)
-- Gerçek bir sistemde şifreler bcrypt ile hashlenecektir.
-- INSERT INTO users (username, password_hash) VALUES ('testuser', '$2b$10$wY9... hash');
