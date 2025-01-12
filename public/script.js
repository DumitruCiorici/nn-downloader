let currentVideoId = null;

// Funcție pentru formatarea duratei
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Funcție pentru formatarea dimensiunii fișierului
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Funcție pentru afișarea formatelor disponibile
function displayFormats(formats) {
    const formatList = document.getElementById('formatList');
    formatList.innerHTML = '';

    // Adăugăm formate video
    formats.video.forEach(format => {
        const div = document.createElement('div');
        div.className = 'format-option';
        div.innerHTML = `
            <div class="format-info">
                <span class="format-quality">${format.quality}</span>
                <span class="format-size">${formatFileSize(format.contentLength)}</span>
            </div>
            <div class="format-type">
                <i class="fas fa-video"></i>
                MP4
            </div>
        `;
        div.onclick = () => processVideo('mp4', format.quality);
        formatList.appendChild(div);
    });

    // Adăugăm formate audio
    formats.audio.forEach(format => {
        const div = document.createElement('div');
        div.className = 'format-option';
        div.innerHTML = `
            <div class="format-info">
                <span class="format-quality">${format.quality}</span>
                <span class="format-size">${formatFileSize(format.contentLength)}</span>
            </div>
            <div class="format-type">
                <i class="fas fa-music"></i>
                MP3
            </div>
        `;
        div.onclick = () => processVideo('mp3', format.quality);
        formatList.appendChild(div);
    });
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
        
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('videoTitle').textContent = data.title;
        document.getElementById('videoAuthor').textContent = data.author;
        document.getElementById('videoDuration').textContent = formatDuration(data.duration);
        displayFormats(data.formats);
        previewDiv.style.display = 'flex';
        
    } catch (error) {
        console.error('Preview error:', error);
        statusText.textContent = 'Could not load video information';
        statusText.classList.add('error');
    }
});

// Funcție pentru procesare video
async function processVideo(format, itag) {
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

        // Start download
        button.classList.add('loading');
        progressBar.classList.add('active');
        statusText.textContent = 'Starting download...';
        progress.style.width = '20%';

        const response = await fetch(`${window.location.origin}/convert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Could not process video');
        }

        const data = await response.json();
        progress.style.width = '60%';

        // Inițiem descărcarea
        const downloadUrl = `${window.location.origin}/download/${data.videoId}/${itag}`;
        window.location.href = downloadUrl;

        progress.style.width = '100%';
        statusText.textContent = 'Download started!';
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