const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Funcție pentru a extrage ID-ul video
function getVideoId(url) {
    let videoId = null;
    
    try {
        // Pentru URL-uri de tip youtu.be
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1];
            if (videoId.includes('?')) {
                videoId = videoId.split('?')[0];
            }
        }
        // Pentru URL-uri standard youtube.com
        else if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1];
            if (videoId.includes('&')) {
                videoId = videoId.split('&')[0];
            }
        }
    } catch (error) {
        console.error('Error extracting video ID:', error);
    }
    
    return videoId;
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const videoId = getVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const info = await ytdl.getInfo(videoUrl);
        if (!info || !info.videoDetails) {
            throw new Error('Could not fetch video info');
        }

        return res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name
        });
    } catch (error) {
        console.error('Convert error:', error);
        return res.status(500).json({ error: 'Could not process video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const videoId = getVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const info = await ytdl.getInfo(videoUrl);
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
            options.quality = 'highestvideo';
            options.filter = 'audioandvideo';
            res.header('Content-Type', 'video/mp4');
            res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        }

        const stream = ytdl(videoUrl, options);
        
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Download failed' });
            }
        });

        stream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Could not process video' });
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