const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(bodyParser.json());

// Configurare director pentru descărcări
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Adăugăm o funcție pentru curățarea periodică a directorului de descărcări
function cleanupDownloads() {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            const stats = fs.statSync(filePath);
            // Ștergem fișierele mai vechi de 1 oră
            if (now - stats.mtime.getTime() > 3600000) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Rulăm cleanup la fiecare 30 de minute
setInterval(cleanupDownloads, 1800000);

// Endpoint pentru conversie și descărcare
app.post('/download', async (req, res) => {
    const { url, format } = req.body;
    
    try {
        if (!url) {
            return res.status(400).json({ error: 'URL is missing' });
        }

        const outputPath = path.join(downloadsDir, '%(title)s.%(ext)s');
        let command;

        if (format === 'mp3') {
            command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" ${url}`;
        } else {
            command = `yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" ${url}`;
        }

        const { stdout } = await execAsync(command);
        
        // Găsim fișierul descărcat
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files[files.length - 1];
        const filePath = path.join(downloadsDir, downloadedFile);

        // Verificăm dacă fișierul există
        if (!fs.existsSync(filePath)) {
            throw new Error('Download file not found');
        }

        // Trimitem fișierul
        res.download(filePath, downloadedFile, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Ștergem fișierul după trimitere
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error('File deletion error:', unlinkError);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Download failed: ' + error.message });
    }
});

// Endpoint pentru informații video
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        // Extragem ID-ul video
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Obținem informații despre video folosind oEmbed
        const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await response.json();

        res.json({
            title: data.title,
            thumbnail: data.thumbnail_url,
            formats: ['720p', '1080p']
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error processing video' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 