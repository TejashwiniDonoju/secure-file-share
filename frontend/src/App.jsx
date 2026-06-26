import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = "https://secure-share-backend-gxc5.onrender.com"; 

export default function App() {
  const [activeTab, setActiveTab] = useState('about');
  const [initialPin, setInitialPin] = useState('');
  
  const [token, setToken] = useState(sessionStorage.getItem('userToken') || '');
  const [username, setUsername] = useState(sessionStorage.getItem('username') || '');
  const [authMode, setAuthMode] = useState('login'); 

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSecretHint, setAuthSecretHint] = useState(''); 
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
      setActiveTab('send'); 
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
    setActiveTab('about');
  };

  return (
    // 🔥 FIX: Parent wrapper is locked to the screen viewport height and prevents outer document bleeding
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0b0f19', color: '#cbd5e1', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 💻 LEFT NAVIGATION SIDEBAR */}
      <div style={{ width: '260px', background: '#111827', borderRight: '1px solid #1f2937', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box', flexShrink: 0 }}>
        <div>
          <h2 style={{ color: '#38bdf8', margin: 0, fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>🚀 DISPATCHER</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Secure P2P File Ecosystem</p>
        </div>

        {/* Dynamic User Profile Indicator */}
        {token && (
          <div style={{ background: '#1f2937', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: '#34d399', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {username}</span>
            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Logout</button>
          </div>
        )}

        {/* Sidebar Menu Item Link Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <button onClick={() => setActiveTab('about')} style={{ width: '100%', textAlign: 'left', background: activeTab === 'about' ? '#0284c7' : 'transparent', color: activeTab === 'about' ? '#fff' : '#94a3b8', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>🏠 Dashboard Info</button>
          
          {token ? (
            <>
              <button onClick={() => { window.history.pushState({}, '', '/'); setInitialPin(''); setActiveTab('send'); }} style={{ width: '100%', textAlign: 'left', background: activeTab === 'send' ? '#0284c7' : 'transparent', color: activeTab === 'send' ? '#fff' : '#94a3b8', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>📤 Send Files</button>
              <button onClick={() => { setActiveTab('receive'); }} style={{ width: '100%', textAlign: 'left', background: activeTab === 'receive' ? '#0284c7' : 'transparent', color: activeTab === 'receive' ? '#fff' : '#94a3b8', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>📥 Receive Files</button>
            </>
          ) : (
            <button onClick={() => setActiveTab('authenticate')} style={{ width: '100%', textAlign: 'left', background: activeTab === 'authenticate' ? '#0284c7' : 'transparent', color: activeTab === 'authenticate' ? '#fff' : '#94a3b8', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>🔒 Access Portal</button>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#4b5563', textAlign: 'center' }}>v2.4.0 Production Build</div>
      </div>

      {/* 🖥️ RIGHT MAIN APP FULL SCREEN VIEW */}
      {/* 🔥 FIX: Changed height to 100% and added flex: 1 with border-box layout containment */}
      <div style={{ flex: 1, padding: '2.5rem', boxSizing: 'border-box', overflowY: 'auto', height: '100%' }}>
        
        {activeTab === 'about' && (
          <DashboardWelcomeView isLoggedIn={!!token} onGetStarted={() => token ? setActiveTab('send') : setActiveTab('authenticate')} />
        )}

        {activeTab === 'authenticate' && !token && (
          <div style={{ maxWidth: '480px', margin: '2rem auto 0 auto', background: '#111827', padding: '2.5rem', borderRadius: '12px', border: '1px solid #1f2937', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Portal Authentication</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem 0' }}>Complete verification loops to unlock file routing consoles.</p>
            
            {authError && <div className="error-box" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}
            {authSuccess && <div className="success-box" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#34d399', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authSuccess}</div>}

            {authMode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Email Address</label><input type="email" placeholder="name@domain.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Password</label><input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Sign In</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                  <span onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('register'); }} style={{ color: '#38bdf8', cursor: 'pointer' }}>Create Account</span>
                  <span onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('forgot'); }} style={{ color: '#f59e0b', cursor: 'pointer' }}>Forgot Password?</span>
                </div>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Full Name</label><input type="text" placeholder="John Doe" value={authName} onChange={(e) => setAuthName(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Email Address</label><input type="email" placeholder="name@domain.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Secure Password</label><input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#f59e0b' }}>Security Hint Answer (Recovery Tool)</label><input type="text" placeholder="e.g., green" value={authSecretHint} onChange={(e) => setAuthSecretHint(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Register Account</button>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: '0', color: '#94a3b8' }}>Already have an account? <span onClick={() => setAuthMode('login')} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }}>Log In</span></p>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Your Account Email</label><input type="email" placeholder="name@domain.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Security Question Answer</label><input type="text" placeholder="type original hint answer" value={authSecretHint} onChange={(e) => setAuthSecretHint(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <div className="form-group"><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Type New Replacement Password</label><input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
                <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Reset Account Password</button>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: '0' }}><span onClick={() => setAuthMode('login')} style={{ color: '#38bdf8', cursor: 'pointer' }}>Back to Sign In</span></p>
              </form>
            )}
          </div>
        )}

        {activeTab === 'send' && token && <SendView token={token} />}
        {activeTab === 'receive' && token && <ReceiveView urlPin={initialPin} clearUrlPin={() => setInitialPin('')} />}
      </div>
    </div>
  );
}

/**
 * 🏠 DASHBOARD VIEW: Premium Widescreen Grid Matrix
 */
function DashboardWelcomeView({ onGetStarted, isLoggedIn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      
      {/* Premium Hero Banner Callout */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', padding: '3.5rem', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <h1 style={{ color: '#38bdf8', fontSize: '2.6rem', margin: '0 0 0.5rem 0', fontWeight: '800' }}>Secure P2P File Dispatcher</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.15rem', maxWidth: '850px', margin: '0 0 2rem 0', lineHeight: '1.6' }}>
          An ephemeral, high-throughput file-sharing application designed for rapid, compressed bundle distribution via temporary cryptographic codes.
        </p>
        <button onClick={onGetStarted} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.85rem 2.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
          {isLoggedIn ? 'Open Transmission Panel →' : 'Unlock Access Console →'}
        </button>
      </div>

      {/* Grid Row Components */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: '#111827', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8', fontSize: '1.2rem' }}>📦 Multi-File Bundling</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: '1.5' }}>
            Upload dozens of varying data formats simultaneously. Our processing backend compiles them on-the-fly into a single structured zip payload.
          </p>
        </div>
        <div style={{ background: '#111827', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', fontSize: '1.2rem' }}>⚡ Frictionless Retrieval</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: '1.5' }}>
            Recipients skip tedious signups or tracking loops. Files are unlocked via an intuitive 6-digit numeric string or direct URL click parameters.
          </p>
        </div>
        <div style={{ background: '#111827', padding: '1.5rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontSize: '1.2rem' }}>📈 Device History Isolation</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', lineHeight: '1.5' }}>
            Secure account links separate senders and receivers. Monitor real-time downloads and track active data pools safely from a personal console.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '1.4rem' }}>💡 Architectural Comparison Protocol</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #374151' }}>
                <th style={{ padding: '0.75rem', color: '#9ca3af' }}>Metrics Vector</th>
                <th style={{ padding: '0.75rem', color: '#38bdf8' }}>Secure Dispatcher Platform</th>
                <th style={{ padding: '0.75rem', color: '#6b7280' }}>Legacy Standard Methods (Email/Chat)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 'bold' }}>Account Constraints</td>
                <td style={{ padding: '1rem 0.75rem', color: '#34d399' }}>Sender Only (Recipient Allocation Free)</td>
                <td style={{ padding: '1rem 0.75rem', color: '#9ca3af' }}>Dual active profiles mandatory</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 'bold' }}>Throughput Allocations</td>
                <td style={{ padding: '1rem 0.75rem', color: '#34d399' }}>Dynamic Buffer Architecture streams</td>
                <td style={{ padding: '1rem 0.75rem', color: '#9ca3af' }}>Strict payload bounds locked at 25 MB</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 'bold' }}>Data Life Management</td>
                <td style={{ padding: '1rem 0.75rem', color: '#34d399' }}>Automated Cron Server Garbage Purging</td>
                <td style={{ padding: '1rem 0.75rem', color: '#9ca3af' }}>Permanent stagnant disk storage accumulation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * 📤 SENDER VIEW PANEL (Optimized split view layout for full screen)
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
      console.error(err);
    }
  };

  useEffect(() => {
    refreshTrackingMetrics();
  }, [outputPin]);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.on('file-downloaded', (data) => {
      if (outputPin && data.pinCode === outputPin) {
        setLiveNotification(`🎉 Awesome! Someone just downloaded your bundle "${data.fileName}"!`);
      }
      refreshTrackingMetrics();
    });
    return () => socket.disconnect();
  }, [outputPin]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return setError('Please select files.');
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
    // 🔥 WIDESCREEN DOUBLE COLUMN COLUMN LAYOUT
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start', width: '100%' }}>
      
      {/* Left Column: Upload Interaction Form Console */}
      <div style={{ flex: '1 1 450px', background: '#111827', padding: '2rem', borderRadius: '12px', border: '1px solid #1f2937', boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#fff' }}>Upload & Dispatch Assets</h2>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {liveNotification && <div style={{ background: '#0284c7', color: '#fff', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{liveNotification}</div>}

        {!outputPin ? (
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) setFiles([...files, ...Array.from(e.dataTransfer.files)]); }} style={{ border: isDragging ? '2px dashed #38bdf8' : '2px dashed #374151', background: isDragging ? 'rgba(56,189,248,0.05)' : '#1f2937', padding: '3rem 1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('multi-file-input').click()}>
              <span style={{ fontSize: '3rem', display: 'block' }}>📁</span>
              <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>Drag & drop target assets here, or <span style={{ color: '#38bdf8' }}>browse</span></p>
              <input id="multi-file-input" type="file" multiple onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); }} style={{ display: 'none' }} />
            </div>

            {files.length > 0 && (
              <div style={{ background: '#1f2937', padding: '0.75rem', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {files.map((f, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>📄 {f.name}</span>
                      <span onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)); }} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Download Counter Quota Limit</label>
              <select value={downloadLimit} onChange={(e) => setDownloadLimit(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}><option value="1">1 Active Download Only</option><option value="5">5 Active Downloads</option></select></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>Package Lifespan Timeout</label>
              <select value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}><option value="1">1 Operational Hour</option><option value="24">24 Operational Hours (1 Day)</option></select></div>
            <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Compiling Package Stream...' : 'Seal Bundle & Get Key'}</button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ margin: 0, color: '#34d399', fontSize: '0.95rem' }}>🎉 Shared Package Unlocked Successfully:</p>
            <h1 style={{ fontSize: '3.8rem', letterSpacing: '8px', margin: '1rem 0', color: '#38bdf8', fontWeight: '900' }}>{outputPin}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <button onClick={() => navigator.clipboard.writeText(outputPin)} style={{ padding: '0.75rem', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Copy Key Code</button>
              <button onClick={() => navigator.clipboard.writeText(getQuickLink())} style={{ padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🔗 Copy Quick-Link URL</button>
              <button onClick={() => { setOutputPin(''); setFiles([]); setLiveNotification(''); }} style={{ padding: '0.75rem', background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer' }}>Dispatch Secondary Bundle</button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Complete Dashboard Asset Trackers List */}
      <div style={{ flex: '1 1 500px', background: '#111827', padding: '2rem', borderRadius: '12px', border: '1px solid #1f2937', boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>Active Transmission Telemetry</h2>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 1.5rem 0' }}>Real-time database metrics mapped strictly to your session context.</p>
        
        {senderTrackingList.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#4b5563', fontSize: '0.95rem' }}>No telemetry data packets discovered. Deploy an asset bundle to populate.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
            {senderTrackingList.map((file, idx) => (
              <div key={idx} style={{ background: '#1f2937', padding: '1.25rem', borderRadius: '8px', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '0.5px' }}>🔑 {file.pinCode}</span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: file.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: file.status === 'Active' ? '#34d399' : '#f87171', border: file.status === 'Active' ? '1px solid #10b981' : '1px solid #ef4444', fontWeight: 'bold' }}>{file.status}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>📦 {file.originalName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.75rem', background: '#111827', padding: '6px 10px', borderRadius: '4px' }}>
                  <span>Downloads: <strong style={{ color: '#34d399' }}>{file.downloadCount}</strong> / {file.downloadLimit}</span>
                  <span>Expires: {new Date(file.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/**
 * 📥 RECIPIENT MODE PANEL (Stays clean, professional and centered)
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
    <div style={{ maxWidth: '480px', margin: '4rem auto 0 auto', background: '#111827', padding: '2.5rem', borderRadius: '12px', border: '1px solid #1f2937', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
      <h2 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Secure Package Retrieval</h2>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 2rem 0' }}>Provide authorization numeric strings below to command asset chunk downstreams.</p>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid #ef4444' }}>{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); executeDirectDownload(pin); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <input type="text" maxLength="6" placeholder="000000" value={pin} onChange={(e) => setPin(e.target.value)} required style={{ width: '100%', padding: '1rem', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#38bdf8', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', letterSpacing: '8px', boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>{loading ? 'Streaming Archive Binary...' : 'Download Assets Bundle'}</button>
      </form>
    </div>
  );
}