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
        let size = bytes;
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
        statusText.classList.add('error');
    },

    showSuccess(message) {
        const statusText = document.getElementById('statusText');
        statusText.textContent = message;
        statusText.classList.add('success');
    },

    resetStatus() {
        const statusText = document.getElementById('statusText');
        const progressContainer = document.querySelector('.progress-container');
        const progressBar = document.getElementById('progressBar');
        const progress = document.getElementById('progress');

        statusText.textContent = '';
        statusText.classList.remove('error', 'success');
        progressContainer.style.display = 'none';
        progress.style.width = '0%';
        progressBar.classList.remove('active');
    }
};

// Gestionarea UI
const UI = {
    displayFormats(formats) {
        const videoFormats = document.getElementById('videoFormats');
        const audioFormats = document.getElementById('audioFormats');
        
        videoFormats.innerHTML = '';
        audioFormats.innerHTML = '';

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
            videoFormats.appendChild(div);
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
            audioFormats.appendChild(div);
        });
    },

    updatePreview(data) {
        const preview = document.getElementById('videoPreview');
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('videoTitle').textContent = data.title;
        document.getElementById('videoAuthor').textContent = data.author;
        document.getElementById('videoDuration').textContent = utils.formatDuration(data.duration);
        preview.style.display = 'block';
        this.displayFormats(data.formats);
    },

    async startDownload(itag) {
        try {
            const progressContainer = document.querySelector('.progress-container');
            const progressBar = document.getElementById('progressBar');
            const progress = document.getElementById('progress');

            progressContainer.style.display = 'block';
            progressBar.classList.add('active');
            progress.style.width = '50%';
            utils.showSuccess('Starting download...');

            const videoId = this.currentVideoId;
            if (!videoId) throw new Error('Video info not found');

            window.location.href = `/download/${videoId}/${itag}`;
            
            setTimeout(() => {
                progress.style.width = '100%';
                utils.showSuccess('Download started!');
                setTimeout(() => utils.resetStatus(), 3000);
            }, 1000);

        } catch (error) {
            console.error('Download error:', error);
            utils.showError(error.message);
        }
    }
};

// Event Listeners
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    utils.resetStatus();

    if (!url) {
        document.getElementById('videoPreview').style.display = 'none';
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
        UI.currentVideoId = data.id;
        UI.updatePreview(data);

    } catch (error) {
        console.error('Preview error:', error);
        utils.showError(error.message);
        document.getElementById('videoPreview').style.display = 'none';
    }
}); 