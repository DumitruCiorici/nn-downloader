document.addEventListener('DOMContentLoaded', () => {
    // Simulăm un timp minim de încărcare pentru o experiență mai plăcută
    setTimeout(() => {
        const initialLoading = document.getElementById('initialLoading');
        initialLoading.classList.add('fade-out');
        
        // Eliminăm elementul după ce animația s-a terminat
        setTimeout(() => {
            initialLoading.remove();
        }, 500);
    }, 1500); // Loading screen va fi vizibil pentru 1.5 secunde
});

let currentVideoId = null;

function getVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : false;
}

async function validateYouTubeUrl(url) {
    const videoId = getVideoId(url);
    if (!videoId) return false;
    
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Adăugăm această funcție pentru a gestiona starea de loading a butoanelor
function setButtonLoading(format, isLoading) {
    const button = document.querySelector(`.download-btn.${format}-btn`);
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function showLoadingScreen(message = 'Processing...') {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = loadingScreen.querySelector('.loading-text');
    loadingText.textContent = message;
    loadingScreen.classList.add('active');
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.classList.remove('active', 'fade-out');
    }, 300);
}

async function processVideo(format) {
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

        const isValid = await validateYouTubeUrl(url);
        if (!isValid) {
            throw new Error('Invalid YouTube link');
        }

        // Afișare progress bar
        progressBar.style.display = 'block';
        statusText.textContent = 'Preparing conversion...';
        progress.style.width = '20%';

        setButtonLoading(format === 'mp4' ? 'video' : 'audio', true);

        showLoadingScreen('Converting...');

        // Asigurăm-ne că API_URL este definit corect
        const API_URL = window.location.origin;

        // Actualizăm fetch-urile pentru a include credentials
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ url, format })
        };

        // Inițiere conversie
        const convertResponse = await fetch(`${API_URL}/convert`, fetchOptions);

        if (!convertResponse.ok) {
            const error = await convertResponse.json();
            throw new Error(error.error || 'Eroare la conversie');
        }

        const videoInfo = await convertResponse.json();
        progress.style.width = '50%';
        statusText.textContent = 'Downloading...';

        showLoadingScreen('Downloading...');

        // Descărcare fișier
        const downloadResponse = await fetch(`${API_URL}/download`, fetchOptions);

        if (!downloadResponse.ok) {
            const error = await downloadResponse.json();
            throw new Error(error.error || 'Eroare la descărcare');
        }

        progress.style.width = '90%';
        
        // Procesare descărcare
        const blob = await downloadResponse.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        // Creăm un nume de fișier valid
        const safeTitle = videoInfo.title.replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeTitle}.${format}`;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        
        // Forțăm descărcarea
        if (format === 'mp3') {
            a.setAttribute('type', 'audio/mpeg');
        } else {
            a.setAttribute('type', 'video/mp4');
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        progress.style.width = '100%';
        statusText.textContent = 'Download complete!';

        hideLoadingScreen();

        // Ascunde progress bar după 3 secunde
        setTimeout(() => {
            progressBar.style.display = 'none';
            statusText.textContent = '';
        }, 3000);

    } catch (error) {
        hideLoadingScreen();
        console.error('Eroare:', error);
        statusText.textContent = error.message || 'A apărut o eroare. Vă rugăm să încercați din nou.';
        progressBar.style.display = 'none';
    } finally {
        setButtonLoading(format === 'mp4' ? 'video' : 'audio', false);
    }
}

// Actualizare preview când se introduce URL-ul
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    const previewDiv = document.getElementById('videoPreview');
    const videoId = getVideoId(url);

    if (videoId && videoId !== currentVideoId) {
        currentVideoId = videoId;
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('thumbnail').src = data.thumbnail_url;
                document.getElementById('videoTitle').textContent = data.title;
                previewDiv.style.display = 'flex';
            }
        } catch (error) {
            previewDiv.style.display = 'none';
        }
    } else if (!videoId) {
        previewDiv.style.display = 'none';
        currentVideoId = null;
    }
}); 