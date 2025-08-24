export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, size = '1024x1024', quality = 'standard' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality,
                response_format: 'b64_json'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const image_b64 = data.data?.[0]?.b64_json;

        if (!image_b64) {
            throw new Error('No image data received');
        }

        return res.status(200).json({ image_b64 });

    } catch (error) {
        console.error('Image generation error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}