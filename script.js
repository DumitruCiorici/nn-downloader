document.addEventListener('DOMContentLoaded', () => {
    try {
        setTimeout(() => {
            const initialLoading = document.getElementById('initialLoading');
            if (initialLoading) {
                initialLoading.classList.add('fade-out');
                setTimeout(() => {
                    initialLoading.remove();
                }, 500);
            }
        }, 1500);
    } catch (error) {
        console.error('Loading error:', error);
    }
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
            throw new Error(error.error || 'Conversion error');
        }

        const videoInfo = await convertResponse.json();
        
        // Redirecționăm către URL-ul de descărcare
        const downloadResponse = await fetch(`${API_URL}/download`, fetchOptions);
        const { downloadUrl } = await downloadResponse.json();
        
        // Deschidem URL-ul de descărcare într-o nouă fereastră
        window.open(downloadUrl, '_blank');

        progress.style.width = '100%';
        statusText.textContent = 'Download started!';
        hideLoadingScreen();

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