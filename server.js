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
        const info = await ytdl.getBasicInfo(url);
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
        const info = await ytdl.getBasicInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        // Configurare pentru descărcare
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
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
        } else {
            options.quality = 'highestvideo';
            options.filter = 'audioandvideo';
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
        }

        // Inițiem descărcarea
        const stream = ytdl(url, options);

        // Gestionăm erorile de stream
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

        // Gestionăm progresul
        let downloadedBytes = 0;
        stream.on('data', (chunk) => {
            downloadedBytes += chunk.length;
        });

        // Trimitem stream-ul către client
        stream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
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