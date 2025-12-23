const Pusher = require("pusher");

// Ваши ключи вставлены сюда
const pusher = new Pusher({
  appId: "2094512",
  key: "661782bbb2606b4ca876",
  secret: "48167608f904d1dd3eba",
  cluster: "us2",
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { orderId, amount } = req.body; // Vercel body parser включен по умолчанию

    // Отправляем сигнал кассе через Pusher
    await pusher.trigger(orderId, "payment-completed", {
      amount: amount
    });

    return res.status(200).json({ sent: true, orderId });
  }
  res.status(405).send("Method not allowed");
}
