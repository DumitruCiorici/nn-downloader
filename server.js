const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Funcție pentru a gestiona erorile
function handleError(error, res) {
    console.error('Error:', error);
    if (!res.headersSent) {
        res.status(500).json({ 
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Adăugăm timeout pentru request
        const timeout = setTimeout(() => {
            throw new Error('Request timeout');
        }, 30000);

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });

        clearTimeout(timeout);

        // Procesăm formatele disponibile
        const formats = {
            video: [],
            audio: []
        };

        // Procesăm formatele video
        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        formats.video = videoFormats.map(format => ({
            quality: format.qualityLabel,
            mimeType: format.mimeType,
            contentLength: format.contentLength,
            itag: format.itag
        }));

        // Procesăm formatele audio
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        formats.audio = audioFormats.map(format => ({
            quality: format.audioBitrate + 'kbps',
            mimeType: format.mimeType,
            contentLength: format.contentLength,
            itag: format.itag
        }));

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: formats
        });
    } catch (error) {
        handleError(error, res);
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    try {
        const { url, format, quality } = req.body;
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

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        let selectedFormat;
        if (format === 'mp3') {
            selectedFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            res.header('Content-Type', 'audio/mpeg');
            res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        } else {
            selectedFormat = ytdl.chooseFormat(info.formats, {
                quality: 'highest',
                filter: 'audioandvideo'
            });
            res.header('Content-Type', 'video/mp4');
            res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        }

        const stream = ytdl(url, { format: selectedFormat });

        // Gestionare erori pentru stream
        stream.on('error', (err) => {
            handleError(err, res);
        });

        // Timeout pentru stream
        const timeout = setTimeout(() => {
            stream.destroy();
            handleError(new Error('Download timeout'), res);
        }, 300000); // 5 minute timeout

        stream.on('end', () => {
            clearTimeout(timeout);
        });

        stream.pipe(res);
    } catch (error) {
        handleError(error, res);
    }
});

// Rută pentru index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 