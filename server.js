const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode-svg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с поддержкой CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- БЕЗОПАСНОСТЬ ---
// Helmet защищает заголовки (настроен мягко для работы скриптов и стилей)
app.use(helmet({
    contentSecurityPolicy: false, // Отключено для упрощения работы с внешними скриптами/стилями
}));

// Ограничение частоты запросов
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- ПУТИ ---
// Раздаем статику из папки 'public'
// Если файл лежит в public/index.html, он будет доступен по адресу /index.html
app.use(express.static(path.join(__dirname, 'public')));

// --- API ГЕНЕРАЦИИ QR-КОДА ---
app.get('/api/generate-qr', (req, res) => {
    try {
        const orderId = encodeURIComponent(req.query.orderId || 'default');
        const amount = parseFloat(req.query.amount).toFixed(2);

        if (isNaN(amount)) {
            return res.status(400).send('Ошибка: Некорректная сумма');
        }

        // Определяем адрес сервера (автоматически)
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.get('host');
        
        // Ссылка, которую будет сканировать телефон
        // Она ведет на файл payment.html в папке public
        const paymentUrl = `${protocol}://${host}/payment.html?order_id=${orderId}&amount=${amount}`;
        
        // Создаем SVG QR-код
        const svg = new QRCode({
            content: paymentUrl,
            padding: 4,
            width: 256,
            height: 256,
            color: "#00703c",
            background: "#ffffff",
            ecl: "M"
        }).svg();

        res.type('image/svg+xml').send(svg);
    } catch (err) {
        res.status(500).send('Ошибка генерации QR');
    }
});

// --- LOGIC SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Вход в комнату заказа (для кассы и телефона)
    socket.on('join_order', (orderId) => {
        if (typeof orderId === 'string') {
            socket.join(orderId);
            console.log(`Устройство присоединилось к заказу: ${orderId}`);
        }
    });

    // Когда касса создает новый заказ
    socket.on('join_cashier_order', (data) => {
        if (data.orderId) {
            socket.join(data.orderId);
            console.log(`Касса ожидает оплату заказа: ${data.orderId}`);
        }
    });

    // Когда телефон подтверждает оплату
    socket.on('confirm_payment_simulation', (data) => {
        if (data.orderId) {
            console.log(`Сигнал оплаты получен для: ${data.orderId}`);
            // Рассылаем статус 'paid' всем участникам комнаты (кассе)
            io.to(data.orderId).emit('payment_status_update', {
                status: 'paid',
                orderId: data.orderId,
                amount: data.amount,
                message: 'Оплата успешно подтверждена!'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Устройство отключено');
    });
});

// --- ЗАПУСК ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    =================================================
    ✅ СЕРВЕР КАССЫ ЗАПУЩЕН (2025)
    🔗 Локальный адрес: http://localhost:${PORT}
    🔗 Сетевой адрес: http://ваш_ip_адрес:${PORT}
    =================================================
    `);
});
