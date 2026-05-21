const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Yerel ağ IP adresini bulalım (Mobilden kamerayla okutabilmek için)
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const localIp = getLocalIp();

const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO Bağlantısı
io.on('connection', (socket) => {
    console.log('Yeni Socket bağlandı:', socket.id);

    // Frontend, QR token oluşturduğunda bu odaya (token ID) katılacak
    socket.on('join-qr-room', (qrToken) => {
        socket.join(qrToken);
        console.log(`Socket ${socket.id} odaya katıldı: ${qrToken}`);
    });

    socket.on('disconnect', () => {
        console.log('Socket ayrıldı:', socket.id);
        // İsteğe bağlı: active_sessions tablosundan socket_id'yi silebilirsiniz.
    });
});

// 1. Web tarafı için yeni bir QR Token üretme
app.get('/api/auth/qr-generate', async (req, res) => {
    try {
        const qrToken = uuidv4(); // Tahmin edilemez rastgele token
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60 saniye geçerli

        // Veritabanına kaydet (user_id null başlangıçta)
        await db.execute(
            'INSERT INTO login_sessions (qr_token, expires_at) VALUES (?, ?)',
            [qrToken, expiresAt]
        );

        // QR kodunun içerisine sadece token değil, tam doğrulama linkini koyuyoruz.
        // Böylece telefonun kamerasıyla okutulunca direkt ilgili sayfaya gider.
        const port = process.env.PORT || 3000;
        const mobileLink = `http://${localIp}:${port}/mobile.html?token=${qrToken}`;
        const qrDataUrl = await qrcode.toDataURL(mobileLink);

        res.json({ success: true, qrToken, qrCodeUrl: qrDataUrl, expiresIn: 60, mobileLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'QR Token oluşturulamadı.' });
    }
});

// 2. Mobil cihaz (veya başka sayfa) tarafından QR Token'ın doğrulanması
// Mobil uygulama buraya username, password ve okuduğu qrToken ile istek atar.
app.post('/api/auth/qr-verify', async (req, res) => {
    const { username, password, qrToken } = req.body;

    if (!username || !password || !qrToken) {
        return res.status(400).json({ success: false, message: 'Eksik parametreler.' });
    }

    try {
        // a. Kullanıcıyı bul
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre.' });
        }
        const user = users[0];

        // b. Şifre kontrolü (Basit metin karşılaştırması - Gerçekte bcrypt.compare kullanılmalı)
        // const isMatch = await bcrypt.compare(password, user.password_hash);
        if (password !== user.password_hash) { 
            return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        // c. QR Token'ı kontrol et
        const now = new Date().toISOString();
        const [sessions] = await db.execute(
            'SELECT * FROM login_sessions WHERE qr_token = ? AND is_used = FALSE AND expires_at > ?',
            [qrToken, now]
        );

        if (sessions.length === 0) {
            return res.status(400).json({ success: false, message: 'Geçersiz, kullanılmış veya süresi dolmuş QR kod.' });
        }

        // d. Token'ı kullanıldı olarak işaretle ve kullanıcıyı eşleştir
        await db.execute(
            'UPDATE login_sessions SET is_used = TRUE, user_id = ? WHERE qr_token = ?',
            [user.id, qrToken]
        );

        // Web tarafındaki Socket.IO odasına (qrToken) "login-success" eventi gönder
        io.to(qrToken).emit('login-success', {
            success: true,
            userId: user.id,
            username: user.username,
            message: 'Giriş başarılı, yönlendiriliyorsunuz...'
        });

        res.json({ success: true, message: 'Web oturumu başarıyla açıldı!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Test kullanıcısı oluşturmak için yardımcı bir endpoint (Geliştirme amaçlı)
app.post('/api/test-user', async (req, res) => {
    const { username, password } = req.body;
    try {
        await db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password]);
        res.json({ success: true, message: 'Test kullanıcısı oluşturuldu.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kullanıcı oluşturulamadı.' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server çalışıyor: http://localhost:${PORT}`);
});
