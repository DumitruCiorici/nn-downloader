const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());

// Endpoint pentru informații video
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        const info = await ytdl.getInfo(url);
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error processing video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const { url, format } = req.body;
    
    try {
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        if (format === 'mp3') {
            // Pentru MP3, folosim cea mai bună calitate audio
            const stream = ytdl(url, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
            
            stream.pipe(res);
        } else {
            // Pentru MP4, luăm cel mai bun format cu audio și video
            const format = ytdl.chooseFormat(info.formats, {
                quality: 'highest',
                filter: 'audioandvideo'
            });

            const stream = ytdl(url, {
                format: format
            });

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
            
            stream.pipe(res);
        }

        // Gestionare erori pentru stream
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

    } catch (error) {
        console.error('Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
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