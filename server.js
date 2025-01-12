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

// Funcție optimizată pentru extragerea informațiilor video
async function getVideoInfo(url) {
    try {
        const videoId = ytdl.getVideoID(url);
        const info = await ytdl.getInfo(videoId, {
            requestOptions: {
                headers: {
                    // Simulăm un browser real
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            }
        });
        return { videoId, info };
    } catch (error) {
        throw new Error('Could not process YouTube URL');
    }
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const { info } = await getVideoInfo(url);
        // Returnăm mai multe informații utile
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint optimizat pentru descărcare
app.post('/download', async (req, res) => {
    const { url, format } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const { videoId, info } = await getVideoInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        const options = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        };

        if (format === 'mp3') {
            // Optimizat pentru audio
            const audioFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            
            options.format = audioFormat;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
        } else {
            // Optimizat pentru video
            const videoFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highest',
                filter: format => format.hasVideo && format.hasAudio
            });
            
            options.format = videoFormat;
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
        }

        const stream = ytdl(videoId, options);

        // Gestionare îmbunătățită a stream-ului
        stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

        // Adăugăm un timeout pentru a evita blocajele
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({ error: 'Download timeout' });
            }
            stream.destroy();
        }, 300000); // 5 minute timeout

        stream.once('response', () => {
            clearTimeout(timeout);
        });

        stream.pipe(res);

    } catch (error) {
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