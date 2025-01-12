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

// Utilități
const utils = {
    validateYouTubeUrl(url) {
        try {
            const videoId = ytdl.getVideoID(url);
            return videoId ? true : false;
        } catch (error) {
            return false;
        }
    },

    async getVideoInfo(url) {
        const options = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            }
        };

        const info = await ytdl.getInfo(url, options);
        return info;
    },

    processFormats(formats) {
        const processed = {
            audio: [],
            video: []
        };

        formats.forEach(format => {
            const item = {
                itag: format.itag,
                mimeType: format.mimeType,
                quality: format.qualityLabel || `${format.audioBitrate}kbps`,
                size: format.contentLength,
                url: format.url
            };

            if (format.hasVideo && format.hasAudio) {
                processed.video.push(item);
            } else if (!format.hasVideo && format.hasAudio) {
                processed.audio.push(item);
            }
        });

        return processed;
    }
};

// Cache pentru informații video
const videoCache = new Map();

// Endpoint pentru informații video
app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!utils.validateYouTubeUrl(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await utils.getVideoInfo(url);
        const formats = utils.processFormats(info.formats);
        
        const videoData = {
            id: info.videoDetails.videoId,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats
        };

        // Cache pentru 5 minute
        videoCache.set(info.videoDetails.videoId, {
            timestamp: Date.now(),
            data: videoData
        });

        res.json(videoData);
    } catch (error) {
        console.error('Info error:', error);
        res.status(500).json({ 
            error: 'Could not fetch video info',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint pentru descărcare
app.get('/api/download/:videoId/:itag', async (req, res) => {
    try {
        const { videoId, itag } = req.params;
        const cached = videoCache.get(videoId);

        if (!cached || Date.now() - cached.timestamp > 300000) { // 5 minute cache
            return res.status(404).json({ error: 'Video info expired. Please refresh.' });
        }

        const format = [...cached.data.formats.video, ...cached.data.formats.audio]
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