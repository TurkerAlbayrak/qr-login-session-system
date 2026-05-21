const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// SQLite veritabanı dosyasını proje klasöründe oluşturur (database.sqlite)
let dbPromise = open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
}).then(async (db) => {
    console.log('SQLite veritabanı bağlantısı başarılı ve tablolar hazırlanıyor...');
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS login_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NULL,
            qr_token TEXT NOT NULL UNIQUE,
            is_used BOOLEAN DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS active_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            socket_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // Test kullanıcısını otomatik ekleyelim (Eğer yoksa)
    try {
        await db.run("INSERT INTO users (username, password_hash) VALUES ('testuser', '123456')");
    } catch (e) {
        // Kullanıcı zaten varsa SQLite constraint hatası verir, bunu yoksayabiliriz.
    }

    return db;
});

// `mysql2` kütüphanesindeki yapıyı taklit eden basit bir execute fonksiyonu
module.exports = {
    execute: async (query, params = []) => {
        const db = await dbPromise;
        // SQLite'da boolean değerler (TRUE/FALSE) 1/0 olarak saklandığı için query düzeltmeleri
        query = query.replace(/\bTRUE\b/g, '1').replace(/\bFALSE\b/g, '0');
        
        if (query.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await db.all(query, params);
            return [rows]; // `mysql2` deki gibi [rows, fields] yapısını simüle eder
        } else {
            const result = await db.run(query, params);
            return [result]; 
        }
    }
};
