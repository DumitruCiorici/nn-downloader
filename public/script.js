let currentVideoId = null;

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
            body: JSON.stringify({ url, format })
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

// Actualizare preview când se introduce URL-ul
document.getElementById('youtubeUrl').addEventListener('input', async function(e) {
    const url = e.target.value.trim();
    const previewDiv = document.getElementById('videoPreview');
    
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
        
    } catch (error) {
        previewDiv.style.display = 'none';
        console.error('Error:', error);
    }
}); 