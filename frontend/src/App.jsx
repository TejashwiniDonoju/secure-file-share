import React, { useState, useEffect } from 'react';

// Change this string variable when deploying to a live service like Render
const BACKEND_URL = "https://secure-share-backend-gxc5.onrender.com"; 

export default function App() {
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'

  return (
    <div className="app-container" style={{ padding: '20px' }}>
      {/* Universal Segmented Navigation Control */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('send')} 
          style={{ width: 'auto', background: activeTab === 'send' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}
        >
          📤 Send File
        </button>
        <button 
          onClick={() => setActiveTab('receive')} 
          style={{ width: 'auto', background: activeTab === 'receive' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}
        >
          📥 Receive File
        </button>
      </div>

      {activeTab === 'send' ? <SendView /> : <ReceiveView />}
    </div>
  );
}

/**
 * 📤 SENDER MODE PANEL
 */
function SendView() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [downloadLimit, setDownloadLimit] = useState(5);
  const [expiryHours, setExpiryHours] = useState(24);
  const [outputPin, setOutputPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
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
      if (!res.ok) throw new Error(data.error);
      setOutputPin(data.pinCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Generate Transfer Pin</h2>
      {error && <div className="error-box">{error}</div>}

      {!outputPin ? (
        <form onSubmit={handleUpload}>
          <div className="form-group"><label>Choose File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required /></div>
          <div className="form-group"><label>Set File Password</label>
            <input type="password" placeholder="Create file password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div className="form-group"><label>Maximum Downloads Allowed</label>
            <select value={downloadLimit} onChange={(e) => setDownloadLimit(e.target.value)}>
              <option value="1">1 Download Only</option>
              <option value="5">5 Downloads</option>
            </select></div>
          <div className="form-group"><label>Link Expiration Time</label>
            <select value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}>
              <option value="1">1 Hour</option>
              <option value="24">24 Hours</option>
            </select></div>
          <button type="submit">{loading ? 'Uploading File...' : 'Get 6-Digit Pin'}</button>
        </form>
      ) : (
        <div className="success-box" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#34d399' }}>🎉 Share this 6-Digit code with your recipient:</p>
          <h1 style={{ fontSize: '3rem', letterSpacing: '6px', margin: '1rem 0', color: '#38bdf8' }}>{outputPin}</h1>
          <button onClick={() => setOutputPin('')} className="nav-btn">Upload Another File</button>
        </div>
      )}
    </div>
  );
}

/**
 * 📥 RECIPIENT MODE PANEL
 */
function ReceiveView() {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [step, setStep] = useState(1); // Step 1: Pin Check, Step 2: Password Entry
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyPinCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/verify-pin/${pin}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setFileInfo(data);
      setStep(2); // Advance to the password challenge step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/download-by-pin/${pin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Download authentication rejected.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', fileInfo.originalName);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Receive Transfer Box</h2>
      {error && <div className="error-box">{error}</div>}

      {step === 1 ? (
        <form onSubmit={verifyPinCode}>
          <div className="form-group">
            <label>Enter 6-Digit Transfer Pin</label>
            <input 
              type="text" 
              maxLength="6" 
              placeholder="e.g., 582910" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)} 
              required 
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }}
            />
          </div>
          <button type="submit">{loading ? 'Checking pin...' : 'Find File'}</button>
        </form>
      ) : (
        <form onSubmit={handleDownload}>
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>Found File: <br /><strong>{fileInfo?.originalName}</strong></p>
          <div className="form-group">
            <label>Enter File Password</label>
            <input type="password" placeholder="Type password to unlock download" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Download File</button>
          <button onClick={() => { setStep(1); setPin(''); setFileInfo(null); }} className="nav-btn">Cancel</button>
        </form>
      )}
    </div>
  );
}