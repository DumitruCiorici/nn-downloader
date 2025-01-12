const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Cache pentru informații video
const videoCache = new Map();

// Endpoint pentru preview și informații
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });

        // Procesăm formatele disponibile
        const formats = info.formats.map(format => ({
            itag: format.itag,
            quality: format.qualityLabel || format.audioBitrate + 'kbps',
            mimeType: format.mimeType,
            contentLength: format.contentLength,
            hasAudio: format.hasAudio,
            hasVideo: format.hasVideo,
            url: format.url
        }));

        // Salvăm în cache
        const cacheKey = info.videoDetails.videoId;
        videoCache.set(cacheKey, {
            formats,
            title: info.videoDetails.title
        });

        res.json({
            videoId: cacheKey,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: formats.filter(f => f.hasAudio) // Trimitem doar formatele cu audio
        });
    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ error: 'Could not process video' });
    }
});

// Endpoint pentru descărcare directă
app.get('/download/:videoId/:itag', async (req, res) => {
    try {
        const { videoId, itag } = req.params;
        const cachedData = videoCache.get(videoId);

        if (!cachedData) {
            return res.status(404).json({ error: 'Video info not found. Please try again.' });
        }

        const format = cachedData.formats.find(f => f.itag === parseInt(itag));
        if (!format) {
            return res.status(404).json({ error: 'Format not found' });
        }

        // Redirect către URL-ul direct
        res.redirect(format.url);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 