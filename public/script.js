let currentVideoId = null;

// Funcție pentru validarea URL-ului
function isValidYouTubeUrl(url) {
    // Acceptăm orice URL care conține youtube.com sau youtu.be
    return url.includes('youtube.com') || url.includes('youtu.be');
}

// Actualizăm event listener-ul pentru input
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    const previewDiv = document.getElementById('videoPreview');
    
    if (!url) {
        previewDiv.style.display = 'none';
        return;
    }

    if (!isValidYouTubeUrl(url)) {
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
            throw new Error('Could not fetch video info');
        }

        const data = await response.json();
        
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('videoTitle').textContent = data.title;
        previewDiv.style.display = 'flex';
        
    } catch (error) {
        console.error('Preview error:', error);
        previewDiv.style.display = 'none';
    }
});

// Actualizăm funcția de procesare video
async function processVideo(format) {
    const urlInput = document.getElementById('youtubeUrl');
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const button = event.currentTarget; // Butonul care a fost apăsat
    const url = urlInput.value.trim();

    // Resetare UI
    statusText.textContent = '';
    statusText.classList.remove('error', 'success');
    progressBar.classList.remove('active');
    progress.style.width = '0%';
    button.classList.remove('loading');

    try {
        if (!url) {
            throw new Error('Please enter a YouTube URL');
        }

        if (!isValidYouTubeUrl(url)) {
            throw new Error('Please enter a valid YouTube URL');
        }

        // Afișare loading state
        button.classList.add('loading');
        progressBar.classList.add('active');
        statusText.textContent = 'Starting download...';
        progress.style.width = '20%';

        const response = await fetch(`${window.location.origin}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, format })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }

        progress.style.width = '60%';
        statusText.textContent = 'Processing download...';

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `download.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        progress.style.width = '100%';
        statusText.textContent = 'Download complete!';
        statusText.classList.add('success');

    } catch (error) {
        console.error('Download error:', error);
        statusText.textContent = error.message;
        statusText.classList.add('error');
        progress.style.width = '0%';
        progressBar.classList.remove('active');
    } finally {
        button.classList.remove('loading');
    }
} 