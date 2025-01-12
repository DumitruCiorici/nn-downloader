const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const youtubedl = require('youtube-dl-exec');

const app = express();

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('Processing URL:', url);

        if (!url) {
            return res.status(400).json({ error: 'Please enter a YouTube URL' });
        }

        // Obținem informațiile video folosind youtube-dl
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });

        // Procesăm formatele disponibile
        const formats = {
            video: [],
            audio: []
        };

        // Filtrăm și procesăm formatele
        info.formats.forEach(format => {
            const item = {
                formatId: format.format_id,
                quality: format.height ? `${format.height}p` : `${format.abr}kbps`,
                size: format.filesize,
                ext: format.ext,
                url: format.url
            };

            if (format.vcodec !== 'none' && format.acodec !== 'none') {
                formats.video.push(item);
            } else if (format.acodec !== 'none' && format.vcodec === 'none') {
                formats.audio.push(item);
            }
        });

        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            author: info.uploader,
            formats: formats
        });

    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ 
            error: 'Could not process video',
            details: error.message 
        });
    }
});

app.get('/download/:formatId', async (req, res) => {
    try {
        const { url } = req.query;
        const { formatId } = req.params;

        if (!url || !formatId) {
            return res.status(400).json({ error: 'Missing URL or format selection' });
        }

        // Obținem URL-ul direct de descărcare
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            format: formatId
        });

        // Redirect către URL-ul de descărcare
        res.redirect(info.url);

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