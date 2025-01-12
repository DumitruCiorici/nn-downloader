// Utilități
const utils = {
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = parseInt(bytes);
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },

    showError(message) {
        const statusText = document.getElementById('statusText');
        statusText.textContent = message;
        statusText.className = 'error';
    },

    showSuccess(message) {
        const statusText = document.getElementById('statusText');
        statusText.textContent = message;
        statusText.className = 'success';
    }
};

// UI Controller
const UI = {
    elements: {
        preview: document.getElementById('videoPreview'),
        thumbnail: document.getElementById('thumbnail'),
        title: document.getElementById('videoTitle'),
        author: document.getElementById('videoAuthor'),
        duration: document.getElementById('videoDuration'),
        videoFormats: document.getElementById('videoFormats'),
        audioFormats: document.getElementById('audioFormats'),
        urlInput: document.getElementById('youtubeUrl')
    },

    showPreview() {
        this.elements.preview.style.display = 'block';
    },

    hidePreview() {
        this.elements.preview.style.display = 'none';
    },

    updatePreview(data) {
        this.elements.thumbnail.src = data.thumbnail;
        this.elements.title.textContent = data.title;
        this.elements.author.textContent = data.author;
        this.elements.duration.textContent = utils.formatDuration(data.duration);
        this.showPreview();
        this.displayFormats(data.formats);
    },

    displayFormats(formats) {
        this.elements.videoFormats.innerHTML = '';
        this.elements.audioFormats.innerHTML = '';

        // Adăugăm formate video
        formats.video.forEach(format => {
            const div = document.createElement('div');
            div.className = 'format-item';
            div.innerHTML = `
                <div class="format-info">
                    <span class="format-quality">${format.quality}</span>
                    <span class="format-size">${utils.formatFileSize(format.size)}</span>
                </div>
                <div class="format-type">
                    <i class="fas fa-video"></i>
                    MP4
                </div>
            `;
            div.onclick = () => this.startDownload(format.itag);
            this.elements.videoFormats.appendChild(div);
        });

        // Adăugăm formate audio
        formats.audio.forEach(format => {
            const div = document.createElement('div');
            div.className = 'format-item';
            div.innerHTML = `
                <div class="format-info">
                    <span class="format-quality">${format.quality}</span>
                    <span class="format-size">${utils.formatFileSize(format.size)}</span>
                </div>
                <div class="format-type">
                    <i class="fas fa-music"></i>
                    MP3
                </div>
            `;
            div.onclick = () => this.startDownload(format.itag);
            this.elements.audioFormats.appendChild(div);
        });
    },

    startDownload(itag) {
        try {
            utils.showSuccess('Starting download...');
            const url = this.elements.urlInput.value;
            const downloadUrl = `/download/${itag}?url=${encodeURIComponent(url)}`;
            window.location.href = downloadUrl;
            setTimeout(() => utils.showSuccess('Download started!'), 1000);
        } catch (error) {
            console.error('Download error:', error);
            utils.showError(error.message);
        }
    }
};

// Event Listeners
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    
    if (!url) {
        UI.hidePreview();
        return;
    }

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const data = await response.json();
        UI.updatePreview(data);
    } catch (error) {
        console.error('Preview error:', error);
        utils.showError(error.message);
        UI.hidePreview();
    }
}); 