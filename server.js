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

// Curățare periodică a directorului de descărcări
setInterval(() => {
    fs.readdir(downloadsDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                const now = new Date().getTime();
                const endTime = new Date(stats.ctime).getTime() + 3600000; // 1 oră
                if (now > endTime) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 3600000); // Verifică la fiecare oră

// Endpoint pentru conversie
app.post('/convert', async (req, res) => {
    const { url, format } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        if (!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Obținere informații video
        const { stdout } = await execAsync(`yt-dlp -j ${url}`);
        const videoInfo = JSON.parse(stdout);

        res.json({
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail,
            formats: format === 'mp3' ? ['audio'] : ['720p', '1080p']
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Error processing video' });
    }
});

// Endpoint pentru descărcare
app.post('/download', async (req, res) => {
    const { url, format } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is missing' });
    }

    try {
        const outputPath = path.join(downloadsDir, '%(title)s.%(ext)s');
        let command;

        if (format === 'mp3') {
            command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --prefer-ffmpeg -o "${outputPath}" ${url}`;
        } else {
            command = `yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" ${url}`;
        }

        await execAsync(command);

        // Găsire fișier descărcat
        const files = fs.readdirSync(downloadsDir);
        const latestFile = files
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(downloadsDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)[0];

        if (!latestFile) {
            return res.status(500).json({ error: 'Fișierul nu a fost găsit' });
        }

        const filePath = path.join(downloadsDir, latestFile.name);
        
        // Setăm header-urile corecte pentru descărcare
        res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(latestFile.name)}"`);

        // Citim și trimitem fișierul
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Ștergem fișierul după ce s-a terminat trimiterea
        fileStream.on('end', () => {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Eroare la ștergerea fișierului:', err);
            });
        });

        // Gestionăm erorile de stream
        fileStream.on('error', (error) => {
            console.error('Eroare la streaming:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Eroare la trimiterea fișierului' });
            }
        });

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download error' });
        }
    }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Serverul rulează pe portul ${PORT}`);
}); 