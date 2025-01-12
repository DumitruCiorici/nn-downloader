const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Endpoint pentru informații video
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        const info = await ytdl.getInfo(url);
        
        const formats = {
            video: [],
            audio: []
        };

        info.formats.forEach(format => {
            if (format.hasVideo && format.hasAudio) {
                formats.video.push({
                    itag: format.itag,
                    quality: format.qualityLabel,
                    size: format.contentLength
                });
            } else if (format.hasAudio && !format.hasVideo) {
                formats.audio.push({
                    itag: format.itag,
                    quality: `${format.audioBitrate}kbps`,
                    size: format.contentLength
                });
            }
        });

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            formats
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Could not process video' });
    }
});

// Endpoint pentru descărcare
app.get('/download', async (req, res) => {
    try {
        const { url, itag } = req.query;
        
        const stream = ytdl(url, {
            quality: itag
        });

        res.setHeader('Content-Disposition', `attachment; filename="video.mp4"`);
        stream.pipe(res);

    } catch (error) {
        console.error('Error:', error);
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