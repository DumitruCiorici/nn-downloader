const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const ytdlp = require('yt-dlp-exec');

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

        // Obținem informații despre video
        const videoInfo = await ytdlp(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            noWarnings: true,
            noCallHome: true
        });

        // Procesăm formatele
        const formats = {
            video: [],
            audio: []
        };

        // Filtrăm formatele
        videoInfo.formats.forEach(format => {
            if (format.filesize && format.format_id) {
                const item = {
                    id: format.format_id,
                    ext: format.ext,
                    quality: format.height ? `${format.height}p` : format.abr ? `${format.abr}kbps` : 'N/A',
                    size: format.filesize,
                    vcodec: format.vcodec,
                    acodec: format.acodec
                };

                if (format.vcodec !== 'none' && format.acodec !== 'none') {
                    formats.video.push(item);
                } else if (format.acodec !== 'none') {
                    formats.audio.push(item);
                }
            }
        });

        res.json({
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            formats: formats
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Could not process video' });
    }
});

// Endpoint pentru descărcare
app.get('/download', async (req, res) => {
    try {
        const { url, format } = req.query;

        if (!url || !format) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Descărcăm direct
        const stream = ytdlp.raw(url, {
            format: format,
            output: '-'
        });

        // Setăm headers pentru descărcare
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="video.' + (format.includes('audio') ? 'mp3' : 'mp4') + '"');

        // Pipe stream direct către response
        stream.stdout.pipe(res);

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