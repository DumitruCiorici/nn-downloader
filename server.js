const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

// Configurare Express
const app = express();
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Cache pentru informații video
const videoCache = new Map();

// Endpoint pentru informații video (schimbat din /api/info în /convert)
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const videoId = ytdl.getVideoID(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            }
        });

        // Procesăm formatele
        const formats = {
            video: [],
            audio: []
        };

        info.formats.forEach(format => {
            const item = {
                itag: format.itag,
                mimeType: format.mimeType,
                quality: format.qualityLabel || `${format.audioBitrate}kbps`,
                size: format.contentLength,
                url: format.url
            };

            if (format.hasVideo && format.hasAudio) {
                formats.video.push(item);
            } else if (!format.hasVideo && format.hasAudio) {
                formats.audio.push(item);
            }
        });

        // Salvăm în cache
        videoCache.set(videoId, {
            timestamp: Date.now(),
            formats: formats
        });

        res.json({
            id: videoId,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: formats
        });

    } catch (error) {
        console.error('Info error:', error);
        res.status(500).json({ 
            error: 'Could not fetch video info',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint pentru descărcare (schimbat din /api/download în /download)
app.get('/download/:videoId/:itag', async (req, res) => {
    try {
        const { videoId, itag } = req.params;
        const cached = videoCache.get(videoId);

        if (!cached || Date.now() - cached.timestamp > 300000) {
            return res.status(404).json({ error: 'Video info expired. Please refresh.' });
        }

        const format = [...cached.formats.video, ...cached.formats.audio]
            .find(f => f.itag === parseInt(itag));

        if (!format) {
            return res.status(404).json({ error: 'Format not found' });
        }

        res.redirect(format.url);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Rute statice
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Pornire server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Curățare cache periodică
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of videoCache.entries()) {
        if (now - value.timestamp > 300000) { // 5 minute
            videoCache.delete(key);
        }
    }
}, 60000); // Verifică la fiecare minut 