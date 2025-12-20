// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode-svg'); // Библиотека для генерации QR на сервере

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Обслуживаем статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API для генерации QR-кода на сервере
app.get('/api/generate-qr', (req, res) => {
    const orderId = req.query.orderId;
    // URL для оплаты, который будет закодирован в QR-код
    const paymentUrl = `http://localhost:3000/pay.html?order_id=${orderId}&amount=${req.query.amount}`;
    
    const svg = new QRCode(paymentUrl).svg();
    res.type('image/svg+xml').send(svg);
});

io.on('connection', (socket) => {
    console.log(`Новое соединение: ${socket.id}`);

    // Касса подключается к определенному каналу заказа
    socket.on('join_cashier_order', (orderId) => {
        socket.join(orderId);
        console.log(`Касса присоединилась к заказу ${orderId}`);
    });

    // Клиент нажимает "Оплатить" на своей странице
    socket.on('confirm_payment_simulation', (data) => {
        // Отправляем сигнал об оплате обратно в "комнату" кассы
        io.to(data.orderId).emit('payment_status_update', { 
            status: 'paid', 
            amount: data.amount,
            message: 'Транзакция успешно симулирована.'
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));