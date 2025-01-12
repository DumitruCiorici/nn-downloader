const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(bodyParser.json());

// Endpoint pentru informații video
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await response.json();

        res.json({
            title: data.title,
            thumbnail: data.thumbnail_url,
            videoId: videoId
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
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Folosim un serviciu extern pentru descărcare
        const downloadUrl = format === 'mp3'
            ? `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`
            : `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4`;

        res.json({ downloadUrl });
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