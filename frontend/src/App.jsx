import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = "https://secure-share-backend-gxc5.onrender.com"; 

export default function App() {
  const [activeTab, setActiveTab] = useState('send');
  const [initialPin, setInitialPin] = useState('');
  
  const [token, setToken] = useState(sessionStorage.getItem('userToken') || '');
  const [username, setUsername] = useState(sessionStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'

  // Input states
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSecretHint, setAuthSecretHint] = useState(''); // Tracking secret answer inputs
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin && urlPin.length === 6) {
      setInitialPin(urlPin);
      setActiveTab('receive');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem('userToken', data.token);
      sessionStorage.setItem('username', data.username);
      setToken(data.token);
      setUsername(data.username);
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword, secretHint: authSecretHint })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthSuccess(data.message);
      setAuthMode('login'); 
      setAuthName('');
      setAuthPassword('');
      setAuthSecretHint('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, secretHint: authSecretHint, newPassword: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthSuccess(data.message);
      setAuthMode('login');
      setAuthPassword('');
      setAuthSecretHint('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setToken('');
    setUsername('');
    setActiveTab('send');
  };

  return (
    <div className="app-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      
      {token && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#34d399' }}>👤 Welcome back, {username}!</span>
          <button onClick={handleLogout} style={{ width: 'auto', background: '#ef4444', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Logout</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '2rem' }}>
        <button onClick={() => { window.history.pushState({}, '', '/'); setInitialPin(''); setActiveTab('send'); }} style={{ width: 'auto', background: activeTab === 'send' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}>📤 Send Files</button>
        <button onClick={() => { setActiveTab('receive'); }} style={{ width: 'auto', background: activeTab === 'receive' ? '#0284c7' : '#334155', padding: '0.6rem 1.5rem' }}>📥 Receive Files</button>
      </div>

      {activeTab === 'send' && (
        token ? <SendView token={token} /> : 
        <div className="card">
          <h2>🔒 Sender Authentication Required</h2>
          
          {authError && <div className="error-box">{authError}</div>}
          {authSuccess && <div className="success-box">{authSuccess}</div>}

          {authMode === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group"><label>Email Address</label>
                <input type="email" placeholder="enter email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required /></div>
              <div className="form-group"><label>Password</label>
                <input type="password" placeholder="enter password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required /></div>
              <button type="submit">Sign In</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '1rem' }}>
                <span onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('register'); }} style={{ color: '#38bdf8', cursor: 'pointer' }}>Create Account</span>
                <span onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('forgot'); }} style={{ color: '#f59e0b', cursor: 'pointer' }}>Forgot Password?</span>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-group"><label>Full Name</label>
                <input type="text" placeholder="enter name" value={authName} onChange={(e) => setAuthName(e.target.value)} required /></div>
              <div className="form-group"><label>Email Address</label>
                <input type="email" placeholder="enter email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required /></div>
              <div className="form-group"><label>Secure Password</label>
                <input type="password" placeholder="create password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required /></div>
              <div className="form-group">
                <label style={{ color: '#f59e0b' }}>Security Question: What is your mother's maiden name or favorite color?</label>
                <input type="text" placeholder="enter secret answer" value={authSecretHint} onChange={(e) => setAuthSecretHint(e.target.value)} required />
              </div>
              <button type="submit">Register Account</button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1rem', color: '#94a3b8' }}>Already have an account? <span onClick={() => setAuthMode('login')} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }}>Log In</span></p>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleResetPassword}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Provide your verified registration email and answer your security query question to declare a new replacement password passkey.</p>
              <div className="form-group"><label>Your Account Email</label>
                <input type="email" placeholder="enter account email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required /></div>
              <div className="form-group"><label>What is your security question answer?</label>
                <input type="text" placeholder="enter your secret answer" value={authSecretHint} onChange={(e) => setAuthSecretHint(e.target.value)} required /></div>
              <div className="form-group"><label>Type Your Brand New Password</label>
                <input type="password" placeholder="enter fresh password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required /></div>
              <button type="submit" style={{ background: '#f59e0b' }}>Reset Account Password</button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1rem' }}><span onClick={() => setAuthMode('login')} style={{ color: '#38bdf8', cursor: 'pointer' }}>Back to Sign In</span></p>
            </form>
          )}
        </div>
      )}

      {activeTab === 'receive' && <ReceiveView urlPin={initialPin} clearUrlPin={() => setInitialPin('')} />}
    </div>
  );
}

/**
 * 📤 SENDER VIEW
 */
function SendView({ token }) {
  const [files, setFiles] = useState([]);
  const [downloadLimit, setDownloadLimit] = useState(5);
  const [expiryHours, setExpiryHours] = useState(24);
  const [outputPin, setOutputPin] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveNotification, setLiveNotification] = useState('');
  const [senderTrackingList, setSenderTrackingList] = useState([]);

  const refreshTrackingMetrics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history-metrics`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const liveData = await res.json();
      if (res.ok && Array.isArray(liveData)) {
        setSenderTrackingList(liveData);
      }
    } catch (err) {
      console.error("Failed to fetch user tracks.", err);
    }
  };

  useEffect(() => {
    refreshTrackingMetrics();
  }, [outputPin]);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.on('file-downloaded', (data) => {
      if (outputPin && data.pinCode === outputPin) {
        setLiveNotification(`🎉 Awesome! Someone just downloaded your bundle "${data.fileName}"! (Total Downloads: ${data.count})`);
      }
      refreshTrackingMetrics();
    });
    return () => socket.disconnect();
  }, [outputPin]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return setError('Please select at least one file.');
    setError('');
    setLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('downloadLimit', downloadLimit);
    formData.append('expiryHours', expiryHours);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutputPin(data.pinCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQuickLink = () => `${window.location.origin}/?pin=${outputPin}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2>Upload and Share</h2>
        {error && <div className="error-box">{error}</div>}
        {liveNotification && <div className="success-box" style={{ background: '#0284c7' }}><strong>{liveNotification}</strong></div>}

        {!outputPin ? (
          <form onSubmit={handleUpload}>
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) setFiles([...files, ...Array.from(e.dataTransfer.files)]); }} style={{ border: isDragging ? '2px dashed #38bdf8' : '2px dashed #334155', background: isDragging ? 'rgba(56, 189, 248, 0.05)' : '#0f172a', padding: '2rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', marginBottom: '1.25rem' }} onClick={() => document.getElementById('multi-file-input').click()}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📁</span>
              <p style={{ margin: 0, color: '#94a3b8' }}>Drag & drop files here, or <span style={{ color: '#38bdf8' }}>browse</span></p>
              <input id="multi-file-input" type="file" multiple onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); }} style={{ display: 'none' }} />
            </div>

            {files.length > 0 && (
              <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {files.map((f, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', padding: '0.25rem 0' }}>
                      <span>📄 {f.name}</span>
                      <span onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)); }} style={{ color: '#ef4444', cursor: 'pointer' }}>✕</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="form-group"><label>Maximum Downloads Allowed</label>
              <select value={downloadLimit} onChange={(e) => setDownloadLimit(e.target.value)}><option value="1">1 Download Only</option><option value="5">5 Downloads</option></select></div>
            <div className="form-group"><label>Link Expiration Time</label>
              <select value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)}><option value="1">1 Hour</option><option value="24">24 Hours (1 Day)</option></select></div>
            <button type="submit" disabled={loading || files.length === 0}>{loading ? 'Uploading & Zipping...' : 'Get 6-Digit Pin'}</button>
          </form>
        ) : (
          <div className="success-box" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#34d399' }}>🎉 Share this 6-Digit code or the Quick-Link:</p>
            <h1 style={{ fontSize: '3.5rem', letterSpacing: '6px', margin: '0.5rem 0', color: '#38bdf8' }}>{outputPin}</h1>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigator.clipboard.writeText(outputPin)} style={{ background: '#334155' }}>Copy Pin Code</button>
              <button onClick={() => navigator.clipboard.writeText(getQuickLink())} style={{ background: '#10b981' }}>🔗 Copy Quick-Link URL</button>
              <button onClick={() => { setOutputPin(''); setFiles([]); setLiveNotification(''); }} className="nav-btn">Upload Another File</button>
            </div>
          </div>
        )}
      </div>

      {senderTrackingList.length > 0 && (
        <div className="card" style={{ background: '#111827', borderTop: '4px solid #0284c7' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>📈 Your Active File Trackers</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>Tracks files uploaded strictly under your account.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {senderTrackingList.map((file, idx) => (
              <div key={idx} style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38bdf8' }}>🔑 {file.pinCode}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: file.status === 'Active' ? '#065f46' : '#991b1b', color: '#fff' }}>
                    {file.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                  📄 {file.originalName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                  <span>Downloads: <strong style={{ color: '#34d399' }}>{file.downloadCount}</strong> / {file.downloadLimit}</span>
                  <span>Expires: {new Date(file.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 📥 RECIPIENT VIEW
 */
function ReceiveView({ urlPin, clearUrlPin }) {
  const [pin, setPin] = useState(urlPin || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlPin && urlPin.length === 6) {
      setPin(urlPin);
      executeDirectDownload(urlPin);
    }
  }, [urlPin]);

  const executeDirectDownload = async (targetPin) => {
    if (!targetPin) return;
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
      
      window.history.pushState({}, '', '/');
      clearUrlPin();
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
          <input type="text" maxLength="6" placeholder="e.g., 123456" value={pin} onChange={(e) => setPin(e.target.value)} required style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '4px' }} />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Downloading Archive...' : 'Download Files'}</button>
      </form>
    </div>
  );
}