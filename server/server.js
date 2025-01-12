const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/convert', async (req, res) => {
    try {
        const { url, format } = req.body;
        
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'URL invalid' });
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;

        if (format === 'mp3') {
            res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
            ytdl(url, {
                quality: 'highestaudio',
                filter: 'audioonly',
            }).pipe(res);
        } else if (format === 'mp4') {
            res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
            ytdl(url, {
                quality: 'highest',
                filter: format => format.container === 'mp4'
            }).pipe(res);
        }
    } catch (error) {
        res.status(500).json({ error: 'A apărut o eroare la conversie' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Serverul rulează pe portul ${PORT}`);
    });
} 