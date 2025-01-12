const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

// Configurare middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Logging pentru debugging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { url } = req.body;
    console.log(`[${timestamp}] Convert request for URL: ${url}`);
    
    try {
        let videoId;
        try {
            videoId = ytdl.getVideoID(url);
        } catch (error) {
            console.log(`[${timestamp}] Could not extract video ID from URL: ${url}`);
            return res.status(400).json({ error: 'Could not process YouTube URL' });
        }

        console.log(`[${timestamp}] Video ID: ${videoId}`);
        
        const info = await ytdl.getBasicInfo(videoId);
        console.log(`[${timestamp}] Successfully fetched info for video: ${info.videoDetails.title}`);
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (error) {
        console.error(`[${timestamp}] Preview error:`, error);
        res.status(500).json({ error: 'Could not fetch video info' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { url, format } = req.body;
    console.log(`[${timestamp}] Download request - URL: ${url}, Format: ${format}`);
    
    try {
        let videoId;
        try {
            videoId = ytdl.getVideoID(url);
        } catch (error) {
            console.log(`[${timestamp}] Could not extract video ID from URL: ${url}`);
            return res.status(400).json({ error: 'Could not process YouTube URL' });
        }

        console.log(`[${timestamp}] Video ID: ${videoId}`);
        
        const info = await ytdl.getBasicInfo(videoId);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        console.log(`[${timestamp}] Starting download for: ${title}`);

        const options = {
            quality: format === 'mp3' ? 'highestaudio' : 'highest',
            filter: format === 'mp3' ? 'audioonly' : 'audioandvideo'
        };

        const stream = ytdl(videoId, options);

        stream.on('error', (err) => {
            console.error(`[${timestamp}] Stream error:`, err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

        stream.once('response', () => {
            console.log(`[${timestamp}] Stream started for: ${title}`);
            if (format === 'mp3') {
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
            } else {
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
            }
        });

        stream.pipe(res);

    } catch (error) {
        console.error(`[${timestamp}] Download error:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
        }
    }
});

// Ruta pentru index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta pentru favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Server running on port ${PORT}`);
}); 