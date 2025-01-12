const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

// Mărim limita pentru request-uri
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Funcție pentru validarea URL-ului
function isValidYouTubeUrl(url) {
    return ytdl.validateURL(url);
}

// Endpoint pentru preview
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoDetails = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
            duration: info.videoDetails.lengthSeconds
        };
        
        res.json(videoDetails);
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Could not fetch video info' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const { url, format } = req.body;
    
    if (!url || !isValidYouTubeUrl(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        if (format === 'mp3') {
            const audioFormat = ytdl.chooseFormat(info.formats, { 
                quality: 'highestaudio',
                filter: 'audioonly' 
            });
            
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
            
            ytdl(url, {
                format: audioFormat,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
            }).pipe(res);
        } else {
            const videoFormat = ytdl.chooseFormat(info.formats, { 
                quality: 'highest',
                filter: 'audioandvideo'
            });
            
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
            
            ytdl(url, {
                format: videoFormat,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
            }).pipe(res);
        }
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