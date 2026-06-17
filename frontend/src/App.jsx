import React, { useState, useEffect } from 'react';

// Change this string variable when deploying to a live service like Render
const BACKEND_URL = "https://secure-share-backend-gxc5.onrender.com"; 

export default function App() {
  const [view, setView] = useState('upload'); // 'upload', 'download', or 'history'
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/download/')) {
      const id = path.split('/download/')[1];
      if (id) {
        setTargetId(id);
        setView('download');
      }
    }
  }, []);

  return (
    <div className="app-container">
      {/* Navigation Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => { window.history.pushState({}, '', '/'); setView('upload'); }} style={{ width: 'auto', padding: '0.5rem 1rem' }}>Upload Form</button>
        <button onClick={() => setView('history')} style={{ width: 'auto', padding: '0.5rem 1rem', background: '#475569' }}>Sender History</button>
      </div>

      {view === 'upload' && <UploadComponent />}
      {view === 'download' && (
        <DownloadComponent fileId={targetId} onBack={() => {
          window.history.pushState({}, '', '/');
          setView('upload');
        }} />
      )}
      {view === 'history' && <HistoryComponent />}
    </div>
  );
}

function HistoryComponent() {
  const [localFiles, setLocalFiles] = useState([]);
  const [activeFileMetrics, setActiveFileMetrics] = useState(null);
  const [error, setError] = useState('');

  // Auto-load files this specific browser uploaded
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('myUploadHistory') || '[]');
    setLocalFiles(history);
  }, []);

  const checkLiveMetrics = async (fileId, password) => {
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/file-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveFileMetrics(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h2>Your Live Shared Files Dashboard</h2>
      {error && <div className="error-box">{error}</div>}

      {activeFileMetrics ? (
        <div className="success-box" style={{ background: '#0f172a', border: '1px solid #334155' }}>
          <h3>Analytics: {activeFileMetrics.originalName}</h3>
          <p><strong>Total Downloads:</strong> <span style={{ color: '#38bdf8', fontSize: '1.25rem' }}>{activeFileMetrics.downloadCount}</span> / {activeFileMetrics.downloadLimit}</p>
          <p><strong>Expires On:</strong> {new Date(activeFileMetrics.expiresAt).toLocaleString()}</p>
          <button onClick={() => setActiveFileMetrics(null)} className="nav-btn">Back to List</button>
        </div>
      ) : (
        <div>
          {localFiles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>You haven't uploaded any files from this browser yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {localFiles.map((file) => (
                <div key={file.id} style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', display: 'flex', justifyContent: 'between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>{file.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Uploaded: {new Date(file.timestamp).toLocaleDateString()}</span>
                  </div>
                  <button 
                    onClick={() => checkLiveMetrics(file.id, file.password)} 
                    style={{ width: 'auto', fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: '#334155' }}
                  >
                    Track Stats
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * UPLOAD MODULE (Sender Screen)
 */
function UploadComponent() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [downloadLimit, setDownloadLimit] = useState(5);
  const [expiryHours, setExpiryHours] = useState(24);
  const [generatedLink, setGeneratedLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !password) return setError('Please fill all mandatory parameter items.');

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    formData.append('downloadLimit', downloadLimit);
    formData.append('expiryHours', expiryHours);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
if (!res.ok) throw new Error(data.error || 'Server upload execution fault.');

setGeneratedLink(data.downloadLink);

// 🔥 NEW LOGIC: Save this entry into the user's browser storage automatically
const newHistoryItem = {
  id: data.fileId,
  name: file.name,
  password: password, // Stored safely in local browser cache to auto-fill metrics later
  timestamp: new Date().getTime()
};

// Retrieve existing dashboard history logs or create a fresh list array
const existingHistory = JSON.parse(localStorage.getItem('myUploadHistory') || '[]');
existingHistory.unshift(newHistoryItem); // Push newest upload to top of list
localStorage.setItem('myUploadHistory', JSON.stringify(existingHistory));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>DropVault Shared Space</h1>
      {error && <div className="error-box">{error}</div>}
      
      {!generatedLink ? (
        <form onSubmit={handleUploadSubmit}>
          <div className="form-group">
            <label>Choose Local File Target</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div className="form-group">
            <label>Set File Password</label>
            <input type="password" placeholder="Create a password to protect this file" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Maximum Downloads Allowed</label>
            <select value={downloadLimit} onChange={(e) => setDownloadLimit(e.target.value)}>
              <option value="1">1 Download Only</option>
              <option value="5">5 Downloads</option>
              <option value="10">10 Downloads</option>
            </select>
          </div>
          <div className="form-group">
            <label>Link Expiration Life Target</label>
            <select value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}>
              <option value="1">1 Hour </option>
              <option value="24">24 Hours Standard</option>
              <option value="168">7 Days(1 Week)</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Processing File Allocation...' : 'Generate Protected Link'}</button>
        </form>
      ) : (
        <div className="success-box">
          <p style={{ margin: 0, color: '#34d399' }}>🎉 File uploaded successfully! Share this link:</p>
          <span className="link-display">{generatedLink}</span>
          <button onClick={() => navigator.clipboard.writeText(generatedLink)}>Copy Link to Clipboard</button>
          <button onClick={() => setGeneratedLink('')} className="nav-btn">Upload Another File</button>
        </div>
      )}
    </div>
  );
}

/**
 * DOWNLOAD MODULE (Recipient Screen)
 */
function DownloadComponent({ fileId, onBack }) {
  const [info, setInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/file-info/${fileId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Link unavailable.');
        setInfo(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fileId]);

  const handleDownloadSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/download/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication Challenge Rejected.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', info.originalName);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="card"><h2>Verifying share link authorization signatures...</h2></div>;
  if (error) return <div className="card"><h2>Access Aborted</h2><div className="error-box">{error}</div><button onClick={onBack} className="nav-btn">Back to Dashboard</button></div>;

  return (
    <div className="card">
      <h2>File Vault Decryption Center</h2>
      <p style={{ textAlign: 'center', color: '#94a3b8' }}>Protected download asset element:<br /><strong>{info?.originalName}</strong></p>
      <form onSubmit={handleDownloadSubmit}>
        <div className="form-group">
          <label>Enter File Password</label>
          <input type="password" placeholder="Type the password to unlock" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Download File</button>
      </form>
      <button onClick={onBack} className="nav-btn">Upload a File Instead</button>
    </div>
  );
}