const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

// Configurare middleware
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
        
        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        // Verificăm dacă URL-ul este valid
        const videoID = getYoutubeID(url);
        if (!videoID) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        console.log('Fetching video info for ID:', videoID); // Debug log

        // Obținem informațiile video
        const info = await ytdl.getInfo(url);
        console.log('Video info fetched successfully'); // Debug log

        // Procesăm formatele disponibile
        const formats = {
            video: [],
            audio: []
        };

        // Filtrăm formatele
        info.formats.forEach(format => {
            if (format.hasVideo && format.hasAudio) {
                formats.video.push({
                    itag: format.itag,
                    quality: format.qualityLabel,
                    size: format.contentLength,
                    mimeType: format.mimeType
                });
            } else if (format.hasAudio && !format.hasVideo) {
                formats.audio.push({
                    itag: format.itag,
                    quality: `${format.audioBitrate}kbps`,
                    size: format.contentLength,
                    mimeType: format.mimeType
                });
            }
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
        console.error('Error in /convert:', error); // Debug log
        res.status(500).json({ 
            error: 'Could not process video',
            details: error.message 
        });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    try {
        const { url, itag } = req.body;

        if (!url || !itag) {
            return res.status(400).json({ error: 'Missing URL or format selection' });
        }

        console.log('Starting download for itag:', itag); // Debug log

        const stream = ytdl(url, {
            quality: itag
        });

        // Setăm headers pentru descărcare
        res.header('Content-Disposition', 'attachment;');
        stream.pipe(res);

    } catch (error) {
        console.error('Error in /download:', error); // Debug log
        res.status(500).json({ error: 'Download failed' });
    }
});

// Servim index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Pornim serverul
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 