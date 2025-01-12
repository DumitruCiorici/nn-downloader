const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

// Configurare middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());

// Endpoint pentru informații video și formate disponibile
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        // Obținem informații despre video
        const info = await ytdl.getInfo(url);
        
        // Organizăm formatele disponibile
        const formats = {
            audio: info.formats
                .filter(format => format.mimeType?.includes('audio'))
                .map(format => ({
                    itag: format.itag,
                    quality: format.audioQuality || 'Standard',
                    size: format.contentLength,
                    format: 'mp3'
                })),
            video: info.formats
                .filter(format => format.mimeType?.includes('video') && format.hasVideo && format.hasAudio)
                .map(format => ({
                    itag: format.itag,
                    quality: format.qualityLabel,
                    size: format.contentLength,
                    format: 'mp4'
                }))
        };

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            formats
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message || 'Error processing video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const { url, format, quality } = req.body;
    
    try {
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        // Setăm headers pentru descărcare
        res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${format}"`);

        // Configurăm opțiunile de descărcare
        const options = {
            quality: quality || 'highest',
            filter: format === 'mp3' ? 'audioonly' : 'audioandvideo'
        };

        // Stream video direct către client
        ytdl(url, options).pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Download failed: ' + error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 