const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Funcție pentru a obține toate formatele disponibile
async function getAllFormats(url) {
    const info = await ytdl.getInfo(url);
    
    // Filtrăm și organizăm formatele
    const formats = {
        audio: [],
        video: []
    };

    // Procesăm formatele audio
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    formats.audio = audioFormats.map(format => ({
        quality: format.audioBitrate + 'kbps',
        mimeType: format.mimeType,
        contentLength: format.contentLength,
        itag: format.itag
    })).sort((a, b) => b.quality.localeCompare(a.quality));

    // Procesăm formatele video
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    formats.video = videoFormats.map(format => ({
        quality: format.qualityLabel,
        mimeType: format.mimeType,
        fps: format.fps,
        contentLength: format.contentLength,
        itag: format.itag
    })).sort((a, b) => {
        const aRes = parseInt(a.quality);
        const bRes = parseInt(b.quality);
        return bRes - aRes;
    });

    return {
        formats,
        info,
        bestAudio: formats.audio[0],
        bestVideo: formats.video[0]
    };
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        const { info, formats } = await getAllFormats(url);
        
        if (parseInt(info.videoDetails.lengthSeconds) > 3600) {
            throw new Error('Video is too long. Maximum length is 60 minutes.');
        }

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            isLive: info.videoDetails.isLive,
            formats: formats
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message || 'Could not process video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    try {
        const { url, format, quality } = req.body;
        const { info, formats } = await getAllFormats(url);
        
        if (parseInt(info.videoDetails.lengthSeconds) > 3600) {
            throw new Error('Video is too long. Maximum length is 60 minutes.');
        }

        if (info.videoDetails.isLive) {
            throw new Error('Cannot download live streams');
        }

        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        let selectedFormat;

        if (format === 'mp3') {
            selectedFormat = formats.audio.find(f => f.quality === quality) || formats.audio[0];
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
        } else {
            selectedFormat = formats.video.find(f => f.quality === quality) || formats.video[0];
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
        }

        const stream = ytdl(url, {
            quality: selectedFormat.itag
        });

        stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

        stream.pipe(res);

    } catch (error) {
        console.error('Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Download failed' });
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 