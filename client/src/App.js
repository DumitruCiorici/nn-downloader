import React, { useState } from 'react';
import './App.css';

const API_URL = process.env.NODE_ENV === 'production' 
    ? '/api/convert'
    : 'http://localhost:5000/convert';

function App() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConvert = async (format) => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format })
            });

            if (!response.ok) {
                throw new Error('Conversie eșuată');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `download.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            setError('A apărut o eroare la conversie. Verificați URL-ul și încercați din nou.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h1>NN Converter</h1>
            <div className="converter-box">
                <input
                    type="text"
                    placeholder="Introduceți URL-ul YouTube"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <div className="buttons">
                    <button 
                        onClick={() => handleConvert('mp3')}
                        disabled={loading || !url}
                    >
                        Convertește în MP3
                    </button>
                    <button 
                        onClick={() => handleConvert('mp4')}
                        disabled={loading || !url}
                    >
                        Descarcă MP4
                    </button>
                </div>
                {loading && <div className="loading">Se procesează...</div>}
                {error && <div className="error">{error}</div>}
            </div>
        </div>
    );
}

export default App; 