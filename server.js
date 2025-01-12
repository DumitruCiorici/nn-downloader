const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

// Mărim limita pentru request-uri
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Funcție pentru a extrage ID-ul video din URL
function extractVideoId(url) {
    try {
        if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1].split('?')[0];
        }
        if (url.includes('youtube.com/watch?v=')) {
            return url.split('v=')[1].split('&')[0];
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const info = await ytdl.getBasicInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive'
                }
            }
        });

        // Returnăm doar informațiile necesare
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name
        });
    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ error: 'Could not process video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getBasicInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
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
            res.header('Content-Type', 'audio/mpeg');
            res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        } else {
            options.quality = 'highest';
            options.filter = 'audioandvideo';
            res.header('Content-Type', 'video/mp4');
            res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        }

        const stream = ytdl(videoUrl, options);
        stream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Rută pentru index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rută pentru favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 