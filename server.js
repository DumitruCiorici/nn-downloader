const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();

// Configurare middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());

// API Key pentru RapidAPI
const RAPID_API_KEY = process.env.RAPID_API_KEY;

// Endpoint pentru informații video și formate disponibile
app.post('/convert', async (req, res) => {
    const { url } = req.body;
    
    try {
        const response = await fetch('https://youtube-video-download-info.p.rapidapi.com/dl', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': 'youtube-video-download-info.p.rapidapi.com'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        // Formatăm răspunsul pentru client
        res.json({
            title: data.title,
            thumbnail: data.thumbnail,
            formats: {
                audio: data.formats.filter(f => f.mimeType.includes('audio')),
                video: data.formats.filter(f => f.mimeType.includes('video'))
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error processing video' });
    }
});

// Endpoint pentru descărcare directă
app.post('/download', async (req, res) => {
    const { url, format, quality } = req.body;
    
    try {
        const response = await fetch('https://youtube-video-download-info.p.rapidapi.com/dl', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': 'youtube-video-download-info.p.rapidapi.com'
            },
            body: JSON.stringify({ 
                url,
                format,
                quality
            })
        });

        const data = await response.json();
        
        // Descărcăm și trimitem fișierul direct către client
        const fileResponse = await fetch(data.downloadUrl);
        const buffer = await fileResponse.buffer();

        // Setăm headers pentru descărcare
        res.setHeader('Content-Disposition', `attachment; filename="${data.title}.${format}"`);
        res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Length', buffer.length);
        
        // Trimitem fișierul
        res.send(buffer);

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