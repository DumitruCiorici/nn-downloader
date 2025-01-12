const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Logging pentru debugging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Funcție pentru a verifica și extrage video ID
async function getVideoInfo(url) {
    try {
        const videoId = ytdl.getVideoID(url);
        const info = await ytdl.getBasicInfo(videoId, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });
        return { videoId, info };
    } catch (error) {
        console.error('Error getting video info:', error);
        throw new Error('Could not process YouTube URL');
    }
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const { info } = await getVideoInfo(url);
        console.log(`[${timestamp}] Successfully fetched info for video: ${info.videoDetails.title}`);
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (error) {
        console.error(`[${timestamp}] Preview error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { url, format } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const { videoId, info } = await getVideoInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        console.log(`[${timestamp}] Starting download for: ${title}`);

        const options = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        };

        if (format === 'mp3') {
            options.quality = 'highestaudio';
            options.filter = 'audioonly';
        } else {
            options.quality = 'highestvideo';
            options.filter = 'audioandvideo';
        }

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
            res.status(500).json({ error: error.message });
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
    console.log(`Server running on port ${PORT}`);
}); 