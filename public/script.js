let currentVideoId = null;

// Funcție pentru validarea URL-ului
function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
    return pattern.test(url);
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
    const url = urlInput.value.trim();

    // Resetare UI
    statusText.textContent = '';
    progressBar.style.display = 'none';
    progress.style.width = '0%';

    try {
        if (!url) {
            throw new Error('Please enter a YouTube URL');
        }

        if (!isValidYouTubeUrl(url)) {
            throw new Error('Invalid YouTube URL format');
        }

        // Afișare progress bar
        progressBar.style.display = 'block';
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

    } catch (error) {
        console.error('Download error:', error);
        statusText.textContent = error.message;
        progressBar.style.display = 'none';
    }
} 