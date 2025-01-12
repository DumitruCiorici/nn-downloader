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
        return ytdl.getVideoID(url);
    } catch (error) {
        return null;
    }
}

// Endpoint pentru preview video
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('Processing URL:', url);

        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        // Folosim ytdl.getInfo direct cu URL-ul
        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                }
            }
        });

        // Procesăm formatele disponibile
        const formats = {
            video: [],
            audio: []
        };

        // Filtrăm formatele
        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

        // Adăugăm formatele video
        videoFormats.forEach(format => {
            formats.video.push({
                itag: format.itag,
                quality: format.qualityLabel,
                size: format.contentLength,
                mimeType: format.mimeType,
                container: format.container
            });
        });

        // Adăugăm formatele audio
        audioFormats.forEach(format => {
            formats.audio.push({
                itag: format.itag,
                quality: `${format.audioBitrate}kbps`,
                size: format.contentLength,
                mimeType: format.mimeType,
                container: format.container
            });
        });

        // Returnăm informațiile necesare
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

// Endpoint pentru descărcare
app.get('/download/:itag', async (req, res) => {
    try {
        const { url } = req.query;
        const { itag } = req.params;

        if (!url || !itag) {
            return res.status(400).json({ error: 'Missing URL or format selection' });
        }

        const info = await ytdl.getInfo(url);
        const format = info.formats.find(f => f.itag === parseInt(itag));

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

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 