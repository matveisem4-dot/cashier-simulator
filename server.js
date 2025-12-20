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

// API для генерации QR-кода с автоматическим определением адреса хостинга
app.get('/api/generate-qr', (req, res) => {
    const orderId = req.query.orderId;
    const amount = req.query.amount;
    
    // Определяем протокол (http или https) и адрес сайта автоматически
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.get('host');
    
    // Формируем ссылку для QR-кода, которая будет работать в интернете
    const paymentUrl = `${protocol}://${host}/pay.html?order_id=${orderId}&amount=${amount}`;
    
    console.log(`🔗 Сгенерирована ссылка для оплаты: ${paymentUrl}`);
    
    const svg = new QRCode(paymentUrl).svg();
    res.type('image/svg+xml').send(svg);
});

io.on('connection', (socket) => {
    console.log(`📡 Новое соединение: ${socket.id}`);

    // Касса подключается к каналу заказа
    socket.on('join_cashier_order', (orderId) => {
        socket.join(orderId);
        console.log(`🛒 Касса подключилась к мониторингу заказа: ${orderId}`);
    });

    // Клиент нажимает "Оплатить" на странице pay.html
    socket.on('confirm_payment_simulation', (data) => {
        console.log(`💰 Оплата получена для заказа: ${data.orderId}`);

        // Отправляем сигнал об успехе в комнату заказа (кассиру)
        io.to(data.orderId).emit('payment_status_update', { 
            status: 'paid', 
            orderId: data.orderId,
            amount: data.amount,
            message: 'Транзакция успешно завершена!'
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Соединение закрыто: ${socket.id}`);
    });
});

// Используем порт, который выдает хостинг (важно для Render/Amvera)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('=========================================');
    console.log(`🚀 СЕРВЕР КАССЫ ЗАПУЩЕН`);
    console.log(`📡 Порт: ${PORT}`);
    console.log('=========================================');
});
