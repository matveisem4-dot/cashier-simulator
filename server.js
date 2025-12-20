// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode-svg'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Обслуживаем статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API для генерации QR-кода
app.get('/api/generate-qr', (req, res) => {
    const orderId = req.query.orderId;
    const amount = req.query.amount;
    
    // Ссылка, которую клиент откроет при сканировании QR
    const paymentUrl = `http://localhost:3000/pay.html?order_id=${orderId}&amount=${amount}`;
    
    const svg = new QRCode(paymentUrl).svg();
    res.type('image/svg+xml').send(svg);
});

io.on('connection', (socket) => {
    console.log(`📡 Новое подключение: ${socket.id}`);

    // Касса подключается к каналу конкретного заказа
    socket.on('join_cashier_order', (orderId) => {
        socket.join(orderId);
        console.log(`🛒 Касса подключилась к мониторингу заказа: ${orderId}`);
    });

    // Клиент нажимает "Оплатить" на странице pay.html
    socket.on('confirm_payment_simulation', (data) => {
        console.log(`💰 Получено подтверждение оплаты заказа ${data.orderId} на сумму ${data.amount}`);

        // ПЕРЕДАЕМ ДАННЫЕ ОБРАТНО В КАССУ
        // Мы отправляем статус, сумму И orderId (чтобы cashier.html понял, что это его заказ)
        io.to(data.orderId).emit('payment_status_update', { 
            status: 'paid', 
            orderId: data.orderId, 
            amount: data.amount,
            message: 'Оплата прошла успешно!'
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Соединение закрыто: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('=========================================');
    console.log(`🚀 СЕРВЕР КАССЫ ЗАПУЩЕН`);
    console.log(`🔗 Адрес кассы: http://localhost:${PORT}/cashier.html`);
    console.log('=========================================');
});
