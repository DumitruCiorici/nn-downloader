let currentVideoId = null;
let currentFormats = null;

// Funcția pentru afișarea opțiunilor de calitate
function showQualityOptions(type) {
    const statusText = document.getElementById('statusText');
    const url = document.getElementById('youtubeUrl').value.trim();

    if (!url) {
        statusText.textContent = 'Please enter a YouTube URL first';
        return;
    }

    // Încercăm să obținem formatele disponibile
    fetchVideoFormats(url, type);
}

// Funcție nouă pentru a obține formatele
async function fetchVideoFormats(url, type) {
    const statusText = document.getElementById('statusText');
    const qualitySelector = document.getElementById('qualitySelector');
    const qualityOptions = document.getElementById('qualityOptions');
    const formatButtons = document.getElementById('formatButtons');

    try {
        statusText.textContent = 'Loading available formats...';
        formatButtons.style.display = 'none';
        
        const response = await fetch(`${window.location.origin}/convert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Could not fetch video formats');
        }

        const data = await response.json();
        currentFormats = data.formats;

        // Populăm opțiunile de calitate
        qualityOptions.innerHTML = '';
        const formats = type === 'audio' ? currentFormats.audio : currentFormats.video;
        
        if (!formats || formats.length === 0) {
            throw new Error(`No ${type} formats available`);
        }

        // Sortăm formatele după calitate (pentru video) sau mărime (pentru audio)
        formats.sort((a, b) => {
            if (type === 'video') {
                const getPixels = (quality) => parseInt(quality?.match(/\d+/)?.[0] || '0');
                return getPixels(b.quality) - getPixels(a.quality);
            } else {
                return (parseInt(b.size) || 0) - (parseInt(a.size) || 0);
            }
        });

        formats.forEach(format => {
            const qualityBtn = document.createElement('button');
            qualityBtn.className = 'quality-btn';
            
            const quality = format.quality;
            const size = format.size ? `(${(format.size / 1024 / 1024).toFixed(1)} MB)` : '';
            
            qualityBtn.innerHTML = `
                <span class="quality-label">${quality}</span>
                ${size ? `<span class="quality-size">${size}</span>` : ''}
            `;
            
            qualityBtn.onclick = () => {
                processVideo(format.format, format.itag);
                hideQualitySelector();
            };
            
            qualityOptions.appendChild(qualityBtn);
        });

        qualitySelector.style.display = 'block';
        statusText.textContent = '';

    } catch (error) {
        console.error('Error:', error);
        statusText.textContent = error.message;
        qualitySelector.style.display = 'none';
        formatButtons.style.display = 'flex';
    }
}

async function processVideo(format, quality) {
    const urlInput = document.getElementById('youtubeUrl');
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const url = urlInput.value.trim();

    // Resetare UI
    statusText.textContent = '';
    progressBar.style.display = 'none';
    progress.style.width = '0%';

    try {
        // Validare URL
        if (!url) {
            throw new Error('Please enter a YouTube link');
        }

        // Afișare progress bar
        progressBar.style.display = 'block';
        statusText.textContent = 'Starting download...';
        progress.style.width = '20%';

        const API_URL = window.location.origin;
        
        // Facem request pentru descărcare
        const response = await fetch(`${API_URL}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, format, quality })
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        // Procesăm descărcarea ca blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        // Extragem numele fișierului din header
        const contentDisposition = response.headers.get('content-disposition');
        const fileName = contentDisposition
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `download.${format}`;

        // Creăm link-ul de descărcare
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        progress.style.width = '100%';
        statusText.textContent = 'Download complete!';

    } catch (error) {
        console.error('Error:', error);
        statusText.textContent = error.message || 'An error occurred. Please try again.';
        progressBar.style.display = 'none';
    }
}

// Actualizare preview și formate disponibile când se introduce URL-ul
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    const previewDiv = document.getElementById('videoPreview');
    const qualitySelector = document.getElementById('qualitySelector');
    
    // Reset state
    currentVideoId = null;
    currentFormats = null;
    qualitySelector.style.display = 'none';
    
    if (!url) {
        previewDiv.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/convert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Invalid URL');
        }

        const data = await response.json();
        
        // Actualizăm preview
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('videoTitle').textContent = data.title;
        previewDiv.style.display = 'flex';
        
        // Salvăm formatele disponibile
        currentFormats = data.formats;
        
    } catch (error) {
        previewDiv.style.display = 'none';
        console.error('Error:', error);
    }
}); 

// Adăugăm funcția pentru ascunderea selectorului de calitate
function hideQualitySelector() {
    const qualitySelector = document.getElementById('qualitySelector');
    const formatButtons = document.getElementById('formatButtons');
    
    qualitySelector.style.display = 'none';
    formatButtons.style.display = 'flex';
} 