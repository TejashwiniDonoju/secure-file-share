import React, { useState, useEffect } from 'react';

// Change this string variable when deploying to a live service like Render
const BACKEND_URL = "https://secure-share-backend-gxc5.onrender.com"; 

export default function App() {
  const [activeTab, setActiveTab] = useState('send');

  // Feature 5: Automatically catch a Pin query parameter on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin && urlPin.length === 6) {
      setActiveTab('receive');
    }
  }, []);

  return (
    <div className="app-container" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '2rem' }}>
        <button onClick={() => { window.history.pushState({}, '', '/'); setActiveTab('send'); }} style={{ width: 'auto', background: activeTab === 'send' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}>📤 Send Files</button>
        <button onClick={() => setActiveTab('receive')} style={{ width: 'auto', background: activeTab === 'receive' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}>📥 Receive Files</button>
      </div>

      {activeTab === 'send' ? <SendView /> : <ReceiveView />}
    </div>
  );
}

/**
 * 📤 UPGRADED SENDER PANEL (Drag-and-Drop & Multi-File Support)
 */
function SendView() {
  const [files, setFiles] = useState([]); 
  const [downloadLimit, setDownloadLimit] = useState(5);
  const [expiryHours, setExpiryHours] = useState(24);
  const [outputPin, setOutputPin] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveNotification, setLiveNotification] = useState(''); // 🔥 Track download alert messages

  // 🔥 Feature 1: Listen for real-time WebSocket signals from the backend
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on('file-downloaded', (data) => {
      // Check if the downloaded pin matches the one this user just generated
      if (outputPin && data.pinCode === outputPin) {
        setLiveNotification(`🎉 Awesome! Someone just downloaded your bundle "${data.fileName}"! (Total Downloads: ${data.count})`);
      }
    });

    return () => socket.disconnect(); // Disconnect cleanly when leaving screen
  }, [outputPin]);

  // Feature 2: Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles([...files, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return setError('Please select at least one file.');
    setError('');
    setLoading(true);

    const formData = new FormData();
    // Append all selected files to the same payload key name
    files.forEach((file) => formData.append('files', file));
    formData.append('downloadLimit', downloadLimit);
    formData.append('expiryHours', expiryHours);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutputPin(data.pinCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Feature 5: Quick-Link generator
  const getQuickLink = () => `${window.location.origin}/?pin=${outputPin}`;

  return (
    <div className="card" style={{ maxWidth: '520px' }}>
      <h2>Upload and Share</h2>
      {error && <div className="error-box">{error}</div>}

      {/* 🔥 Show Live Real-time Notification Banner if it exists */}
      {liveNotification && (
        <div className="success-box" style={{ background: '#0284c7', border: '1px solid #38bdf8', animation: 'bounce 1s' }}>
          <strong>{liveNotification}</strong>
        </div>
      )}

      {!outputPin ? (
        <form onSubmit={handleUpload}>
          {/* Drag & Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed #38bdf8' : '2px dashed #334155',
              background: isDragging ? 'rgba(56, 189, 248, 0.05)' : '#0f172a',
              padding: '2rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', marginBottom: '1.25rem'
            }}
            onClick={() => document.getElementById('multi-file-input').click()}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📁</span>
            <p style={{ margin: 0, color: '#94a3b8' }}>Drag & drop files here, or <span style={{ color: '#38bdf8' }}>browse</span></p>
            <input id="multi-file-input" type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>

          {/* Selected Files Badge List */}
          {files.length > 0 && (
            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <label style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Selected Files ({files.length}):</label>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {files.map((f, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', padding: '0.25rem 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>📄 {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <span onClick={(e) => { e.stopPropagation(); removeFile(idx); }} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group"><label>Maximum Downloads Allowed</label>
            <select value={downloadLimit} onChange={(e) => setDownloadLimit(e.target.value)}>
              <option value="1">1 Download Only</option>
              <option value="5">5 Downloads</option>
            </select></div>
          <div className="form-group"><label>Link Expiration Time</label>
            <select value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}>
              <option value="1">1 Hour</option>
              <option value="24">24 Hours (1 Day)</option>
            </select></div>
          <button type="submit" disabled={loading || files.length === 0}>
            {loading ? 'Creating Zip & Syncing...' : 'Get 6-Digit Pin'}
          </button>
        </form>
      ) : (
        <div className="success-box" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#34d399' }}>🎉 Share this 6-Digit code or the Quick-Link:</p>
          <h1 style={{ fontSize: '3.5rem', letterSpacing: '6px', margin: '0.5rem 0', color: '#38bdf8' }}>{outputPin}</h1>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={() => navigator.clipboard.writeText(outputPin)} style={{ background: '#334155' }}>Copy Pin Code</button>
            <button type="button" onClick={() => navigator.clipboard.writeText(getQuickLink())} style={{ background: '#10b981' }}>🔗 Copy Quick-Link URL</button>
            <button type="button" onClick={() => { setOutputPin(''); setFiles([]); setLiveNotification(''); }} className="nav-btn">Upload More Files</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 📥 UPGRADED RECIPIENT PANEL (Automated URL parameter checking)
 */
function ReceiveView() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Feature 5: Automatically pull pin from parameters and download
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin && urlPin.length === 6) {
      setPin(urlPin);
      executeDirectDownload(urlPin);
    }
  }, []);

  const executeDirectDownload = async (targetPin) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/download-by-pin/${targetPin}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Invalid code or archive expired.');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'shared_bundle.zip';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Clean up URL parameters after successful delivery
      window.history.pushState({}, '', '/');
      setPin('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Receive Files</h2>
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={(e) => { e.preventDefault(); executeDirectDownload(pin); }}>
        <div className="form-group">
          <label>Enter 6-Digit Code</label>
          <input 
            type="text" maxLength="6" placeholder="e.g., 123456" value={pin} 
            onChange={(e) => setPin(e.target.value)} required 
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Downloading Archive...' : 'Download Files'}
        </button>
      </form>
    </div>
  );
}