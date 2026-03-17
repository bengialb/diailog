export default async function handler(req, res) {
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.error('Upstash credentials missing');
        return res.status(500).json({ error: 'Database not configured' });
    }

    // GET: tüm soruları listele
    if (req.method === 'GET') {
        try {
            const response = await fetch(`${UPSTASH_URL}/lrange/debate_logs/0/-1`, {
                headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
            });
            const data = await response.json();
            const logs = (data.result || []).map(entry => JSON.parse(entry));
            return res.status(200).json({ logs });
        } catch (error) {
            console.error('DB read error:', error);
            return res.status(500).json({ error: 'Failed to read logs' });
        }
    }

    // POST: yeni soru kaydet
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic, leftChar, rightChar, rounds, language } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const logEntry = JSON.stringify({
            topic,
            leftChar: leftChar || 'Unknown',
            rightChar: rightChar || 'Unknown',
            rounds: rounds || 1,
            language: language || 'tr',
            timestamp: new Date().toISOString()
        });

        await fetch(`${UPSTASH_URL}/lpush/debate_logs/${encodeURIComponent(logEntry)}`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('DB write error:', error);
        return res.status(500).json({ error: 'Failed to save log' });
    }
}
