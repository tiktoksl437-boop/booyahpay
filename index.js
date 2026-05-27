const crypto = require('crypto');

module.exports = async (req, res) => {
    // Kredensial Produksi Terkunci
    const ADMIN_USER = "Miminvin";
    const ADMIN_PASS = "8331461704";
    
    const DIGIFLAZZ_USER = process.env.DIGIFLAZZ_USERNAME;
    const DIGIFLAZZ_KEY = process.env.DIGIFLAZZ_API_KEY;

    // 1. PROSES VERIFIKASI LOGIN (POST METHOD)
    if (req.method === 'POST') {
        const { action, username, password } = req.body;
        if (action === 'login') {
            if (username === ADMIN_USER && password === ADMIN_PASS) {
                // Buat token sesi unik berbasis MD5
                const token = crypto.createHash('md5').update(ADMIN_USER + ADMIN_PASS).digest('hex');
                return res.status(200).json({ authenticated: true, token: token });
            }
            return res.status(200).json({ authenticated: false });
        }
    }

    // 2. PROTEKSI GERBANG API (VALIDASI TOKEN)
    const authHeader = req.headers['authorization'];
    const expectedToken = crypto.createHash('md5').update(ADMIN_USER + ADMIN_PASS).digest('hex');
    const userToken = authHeader && authHeader.split(' ')[1];

    if (!userToken || userToken !== expectedToken) {
        return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
    }

    // 3. AMBIL DATA REAL SALDO DIGIFLAZZ JIKA SUKSES LOGIN
    try {
        if (!DIGIFLAZZ_USER || !DIGIFLAZZ_KEY) {
            return res.status(200).json({ status: 'success', balance: 0, message: 'Keys Belum Ada' });
        }

        // Generate Signature resmi Digiflazz
        const sign = crypto.createHash('md5').update(DIGIFLAZZ_USER + DIGIFLAZZ_KEY + 'depo').digest('hex');

        const apiResponse = await fetch('https://api.digiflazz.com/v1/cek-saldo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: DIGIFLAZZ_USER,
                sign: sign,
                cmd: 'deposit'
            })
        });

        const data = await apiResponse.json();

        if (data && data.data) {
            return res.status(200).json({
                status: 'success',
                balance: data.data.rc === '00' ? data.data.saldo : 0
            });
        } else {
            throw new Error();
        }

    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Gagal ke API Pusat.' });
    }
};
