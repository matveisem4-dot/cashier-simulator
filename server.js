// server.js (С добавленной защитой)
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode-svg'); 
// --- Добавлены модули безопасности ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// ------------------------------------

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Применение модулей безопасности ---
// Устанавливает безопасные HTTP-заголовки
app.use(helmet());

// Ограничивает запросы с одного IP до 100 за 15 минут
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter); 
// ---------------------------------------

// Обслуживаем статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API для генерации QR-кода с автоматическим определением адреса хостинга
app.get('/api/generate-qr', (req, res) => {
    // --- Валидация и очистка ввода ---
    const orderId = encodeURIComponent(req.query.orderId || 'default'); // Очищаем данные от потенциальных атак XSS
    const rawAmount = req.query.amount;
    const amount = parseFloat(rawAmount).toFixed(2); // Проверяем, что это число
    if (isNaN(amount)) {
        return res.status(400).send('Invalid amount format');
    }
    // ---------------------------------

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.get('host');
    
    const paymentUrl = `${protocol}://${host}/public/index.html?order_id=${orderId}&amount=${amount}`;
    
    const svg = new QRCode(paymentUrl).svg();
    res.type('image/svg+xml').send(svg);
});

io.on('connection', (socket) => {
    // Валидация данных в WebSocket-соединениях
    socket.on('client_join_order', (orderId) => {
        if (typeof orderId === 'string' && orderId.length > 5 && orderId.length < 50) {
            socket.join(orderId);
        }
    });

    socket.on('join_cashier_order', (data) => {
        if (typeof data.orderId === 'string' && typeof data.amount === 'string') {
             // Также валидируем данные при подключении кассы
            socket.join(data.orderId);
            io.to(data.orderId).emit('new_order_ready', { 
                orderId: encodeURIComponent(data.orderId), 
                amount: parseFloat(data.amount).toFixed(2)
            });
        }
    });

    socket.on('confirm_payment_simulation', (data) => {
         if (typeof data.orderId === 'string' && typeof data.amount === 'string') {
            io.to(data.orderId).emit('payment_status_update', { 
                status: 'paid', 
                orderId: encodeURIComponent(data.orderId),
                amount: parseFloat(data.amount).toFixed(2),
                message: 'Транзакция успешно завершена!'
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
