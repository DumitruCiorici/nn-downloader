const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Logging pentru debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    console.log('Convert request received:', req.body);
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        const info = await ytdl.getInfo(url);
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Could not fetch video info' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    console.log('Download request received:', req.body);
    const { url, format } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        if (format === 'mp3') {
            ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            })
            .on('error', (err) => {
                console.error('Stream error:', err);
                res.status(500).json({ error: 'Download failed' });
            })
            .on('response', () => {
                res.header('Content-Type', 'audio/mpeg');
                res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
            })
            .pipe(res);
        } else {
            ytdl(url, {
                filter: format => format.hasVideo && format.hasAudio,
                quality: 'highest'
            })
            .on('error', (err) => {
                console.error('Stream error:', err);
                res.status(500).json({ error: 'Download failed' });
            })
            .on('response', () => {
                res.header('Content-Type', 'video/mp4');
                res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
            })
            .pipe(res);
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 