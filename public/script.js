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
        statusText.textContent = 'Processing video...';
        progress.style.width = '50%';

        setButtonLoading(format === 'mp4' ? 'video' : 'audio', true);

        const API_URL = window.location.origin;
        
        // Facem request pentru descărcare
        const response = await fetch(`${API_URL}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, format })
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const { downloadUrl } = await response.json();
        
        // Deschidem URL-ul de descărcare într-o fereastră nouă
        window.open(downloadUrl, '_blank');

        progress.style.width = '100%';
        statusText.textContent = 'Download started! Check your downloads.';

    } catch (error) {
        console.error('Error:', error);
        statusText.textContent = error.message || 'An error occurred. Please try again.';
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