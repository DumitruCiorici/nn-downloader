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
        console.log('Received URL:', url);
        
        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        const videoID = getYoutubeID(url);
        console.log('Extracted Video ID:', videoID);
        
        if (!videoID) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(url);
        console.log('Video info fetched:', info.videoDetails.title);

        const formats = {
            video: [],
            audio: []
        };

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

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: formats
        });

    } catch (error) {
        console.error('Error in /convert:', error);
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
        console.log('Download requested:', { url, itag });

        if (!url || !itag) {
            return res.status(400).json({ error: 'Missing URL or format selection' });
        }

        const stream = ytdl(url, {
            quality: itag
        });

        res.header('Content-Disposition', 'attachment;');
        stream.pipe(res);

    } catch (error) {
        console.error('Error in /download:', error);
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