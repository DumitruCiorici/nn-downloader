const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Endpoint pentru preview și descărcare
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        const info = await ytdl.getInfo(url);
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            formats: info.formats
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Could not process video' });
    }
});

app.post('/download', async (req, res) => {
    try {
        const { url, format } = req.body;
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        if (format === 'mp3') {
            ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            }).pipe(res.attachment(`${title}.mp3`));
        } else {
            ytdl(url, {
                filter: 'audioandvideo',
                quality: 'highest'
            }).pipe(res.attachment(`${title}.mp4`));
        }
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