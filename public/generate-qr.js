const QRCode = require('qrcode-svg');

export default function handler(req, res) {
    const { orderId, amount } = req.query;
    
    if (!orderId || !amount) {
        return res.status(400).send('Missing parameters');
    }

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const paymentUrl = `${protocol}://${host}/payment.html?order_id=${orderId}&amount=${amount}`;

    const svg = new QRCode({
        content: paymentUrl,
        padding: 4,
        width: 256,
        height: 256,
        color: "#00703c",
        background: "#ffffff"
    }).svg();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
}
