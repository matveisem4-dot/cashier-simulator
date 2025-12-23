// server.js (Обновленный код для Vercel)
const Pusher = require("pusher");

// Используем переменные окружения, которые вы добавили в настройках Vercel
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler (req, res) {
  if (req.method === 'POST') {
    // Vercel body parser включен по умолчанию
    const { orderId, amount } = req.body; 

    // Отправляем сигнал кассе через Pusher
    await pusher.trigger(orderId, "payment-completed", {
      amount: amount
    });

    return res.status(200).json({ sent: true, orderId });
  }
  res.status(405).send("Method not allowed");
};
