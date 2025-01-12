const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Funcție pentru a extrage ID-ul video
function getYoutubeID(url) {
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

app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('Processing URL:', url);

        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        const videoID = getYoutubeID(url);
        if (!videoID) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;
        
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            }
        });

        const formats = {
            video: [],
            audio: []
        };

        info.formats.forEach(format => {
            const item = {
                itag: format.itag,
                quality: format.qualityLabel || `${format.audioBitrate}kbps`,
                size: format.contentLength,
                mimeType: format.mimeType,
                url: format.url
            };

            if (format.hasVideo && format.hasAudio) {
                formats.video.push(item);
            } else if (format.hasAudio && !format.hasVideo) {
                formats.audio.push(item);
            }
        });

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: formats
        });

    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ 
            error: 'Could not process video',
            details: error.message 
        });
    }
});

app.get('/download/:itag', async (req, res) => {
    try {
        const { url } = req.query;
        const { itag } = req.params;

        if (!url || !itag) {
            return res.status(400).json({ error: 'Missing URL or format selection' });
        }

        const videoID = getYoutubeID(url);
        if (!videoID) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;
        
        const info = await ytdl.getInfo(videoUrl);
        const format = info.formats.find(f => f.itag === parseInt(itag));

        if (!format) {
            return res.status(404).json({ error: 'Format not found' });
        }

        res.redirect(format.url);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 