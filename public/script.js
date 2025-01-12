let currentVideoId = null;

// Funcție pentru formatarea duratei
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Funcție pentru validarea URL-ului
function isValidYouTubeUrl(url) {
    return url.includes('youtube.com/watch?v=') || 
           url.includes('youtu.be/') ||
           url.includes('youtube.com/v/');
}

// Event listener pentru input
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    const previewDiv = document.getElementById('videoPreview');
    const statusText = document.getElementById('statusText');
    
    // Reset UI
    previewDiv.style.display = 'none';
    statusText.textContent = '';
    statusText.classList.remove('error');

    if (!url) return;

    if (!isValidYouTubeUrl(url)) {
        statusText.textContent = 'Please enter a valid YouTube URL';
        statusText.classList.add('error');
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
        
        // Actualizare UI
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('videoTitle').textContent = data.title;
        document.getElementById('videoAuthor').textContent = `by ${data.author}`;
        document.getElementById('videoDuration').textContent = formatDuration(data.duration);
        previewDiv.style.display = 'flex';
        
    } catch (error) {
        console.error('Preview error:', error);
        statusText.textContent = 'Could not load video information';
        statusText.classList.add('error');
    }
});

// Funcție pentru procesare video
async function processVideo(format) {
    const urlInput = document.getElementById('youtubeUrl');
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const button = event.currentTarget;
    const url = urlInput.value.trim();

    // Reset UI
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

        // Start download
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
        progress.style.width = '80%';
        
        // Inițiere descărcare
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `download.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        // Succes
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