import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IPMap from './IPMap';
import './Home.css';

function Home() {
  const [ipInfo, setIpInfo] = useState(null);
  const [inputIp, setInputIp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [activeIpId, setActiveIpId] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Configure axios with auth token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Load history from API on mount
  useEffect(() => {
    loadHistory();
    // Fetch current user IP on mount
    fetchIpInfo();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/ip-history');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history:', err);
      // Fallback to empty array if API fails
      setHistory([]);
    }
  };

  const saveHistoryToAPI = async (historyItem) => {
    try {
      const response = await axios.post('http://localhost:8000/api/ip-history', {
        ip: historyItem.ip,
        city: historyItem.city,
        region: historyItem.region,
        country: historyItem.country,
        loc: historyItem.loc,
      });
      
      // Update the history item with the real ID from database
      if (response.data && response.data.id) {
        setHistory(prev => {
          const existingIndex = prev.findIndex(item => item.ip === historyItem.ip);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              id: response.data.id,
              created_at: updated[existingIndex].created_at || new Date().toISOString(),
            };
            return updated;
          }
          return prev;
        });
      } else {
        // Reload history if no ID returned (shouldn't happen, but fallback)
        loadHistory();
      }
    } catch (err) {
      console.error('Failed to save history:', err);
      // On error, reload to sync with server
      loadHistory();
    }
  };

  const validateIpAddress = (ip) => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return false;
    }
    
    // Additional validation for IPv4
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return true;
  };

  const fetchIpInfo = async (ip = '', historyItemId = null, skipLoading = false) => {
    setError('');
    
    // Set active IP ID immediately for instant visual feedback
    if (historyItemId) {
      setActiveIpId(historyItemId);
    }
    
    // Don't show loading if we're using cached data
    if (!skipLoading) {
      setLoading(true);
    }
    
    try {
      // Use backend proxy to avoid CORS and rate limiting issues
      const url = ip 
        ? `http://localhost:8000/api/ip-info/${ip}`
        : 'http://localhost:8000/api/ip-info';
      
      const response = await axios.get(url);
      
      if (response.data && response.data.ip) {
        // Only update if we got fresh data (not from cache)
        // This prevents overwriting the instant display with loading state
        setIpInfo(response.data);
        
        // Prepare history item
        const historyItem = {
          ip: response.data.ip,
          city: response.data.city || 'Unknown',
          region: response.data.region || 'Unknown',
          country: response.data.country || 'Unknown',
          loc: response.data.loc || null,
        };
        
        // Add to history immediately (optimistic update) - only if not from history click
        if (!historyItemId) {
          const existingIndex = history.findIndex(item => item.ip === historyItem.ip);
          const tempId = Date.now(); // Temporary ID until API responds
          
          if (existingIndex >= 0) {
            // Update existing item in place (don't move to top)
            setHistory(prev => {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...historyItem,
                updated_at: new Date().toISOString(),
              };
              return updated;
            });
            setActiveIpId(history[existingIndex].id);
          } else {
            // Add new item at the beginning
            const newHistoryItem = {
              id: tempId,
              ...historyItem,
              created_at: new Date().toISOString(),
            };
            setHistory(prev => [newHistoryItem, ...prev]);
            setActiveIpId(tempId);
          }
        } else {
          // From history click, just set active ID
          setActiveIpId(historyItemId);
        }
        
        // Save to API in background and update with real ID
        saveHistoryToAPI(historyItem).catch(err => console.error('History save error:', err));
      } else {
        throw new Error('Invalid response from IP service');
      }
      
      // Clear input
      setInputIp('');
    } catch (err) {
      let errorMessage = 'Failed to fetch IP information';
      
      if (err.response) {
        // API returned an error response
        if (err.response.status === 403) {
          errorMessage = 'IP service access denied. The service may have rate limits. Please try again in a moment.';
        } else if (err.response.data) {
          const data = err.response.data;
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.error) {
            errorMessage = typeof data.error === 'string' ? data.error : String(data.error);
          } else if (data.message) {
            errorMessage = typeof data.message === 'string' ? data.message : String(data.message);
          } else if (data.title) {
            // Handle Laravel validation errors
            errorMessage = typeof data.title === 'string' ? data.title : 'Request failed';
          }
        } else if (err.response.statusText) {
          errorMessage = err.response.statusText;
        }
      } else if (err.message) {
        errorMessage = String(err.message);
      }
      
      setError(String(errorMessage));
      // Only clear ipInfo if we don't have cached data
      if (!skipLoading) {
        setIpInfo(null);
      }
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  const handleIpSubmit = (e) => {
    e.preventDefault();
    
    if (!inputIp.trim()) {
      setError('Please enter an IP address');
      return;
    }
    
    if (!validateIpAddress(inputIp.trim())) {
      setError('Invalid IP address format');
      return;
    }
    
    fetchIpInfo(inputIp.trim());
  };

  const handleClear = () => {
    setInputIp('');
    setError('');
    fetchIpInfo(); // Fetch user's own IP
  };

  const handleHistoryClick = (historyItem) => {
    // Instant visual feedback - set active immediately
    setActiveIpId(historyItem.id);
    
    // Update map instantly with cached history data
    if (historyItem.loc) {
      const cachedIpInfo = {
        ip: historyItem.ip,
        city: historyItem.city,
        region: historyItem.region,
        country: historyItem.country,
        loc: historyItem.loc,
        // Set other fields to null/empty if not available
        org: null,
        postal: null,
        timezone: null,
      };
      setIpInfo(cachedIpInfo);
    }
    
    // Fetch fresh IP info in background (non-blocking, no loading state)
    fetchIpInfo(historyItem.ip, historyItem.id, true);
  };

  const handleHistoryCheckbox = (id) => {
    setSelectedHistory(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedHistory.length === history.length) {
      // Deselect all
      setSelectedHistory([]);
    } else {
      // Select all
      setSelectedHistory(history.map(item => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHistory.length === 0) return;
    
    // Show confirmation alert
    const confirmMessage = selectedHistory.length === 1
      ? 'Are you sure you want to delete this history item?'
      : `Are you sure you want to delete ${selectedHistory.length} history items?`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    try {
      await axios.delete('http://localhost:8000/api/ip-history', {
        data: { ids: selectedHistory }
      });
      // Reload history
      loadHistory();
      setSelectedHistory([]);
    } catch (err) {
      console.error('Failed to delete history:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete history items';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to delete history items');
      alert('Failed to delete history items. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API to revoke token
      await axios.post('http://localhost:8000/api/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    logout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>IP Geolocation Lookup</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      
      <div className="home-content">
        {ipInfo && (
          <>
            <div className="ip-info-card">
              <h2>IP Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">IP Address:</span>
                  <span className="info-value">{ipInfo.ip}</span>
                </div>
                {ipInfo.city && (
                  <div className="info-item">
                    <span className="info-label">City:</span>
                    <span className="info-value">{ipInfo.city}</span>
                  </div>
                )}
                {ipInfo.region && (
                  <div className="info-item">
                    <span className="info-label">Region:</span>
                    <span className="info-value">{ipInfo.region}</span>
                  </div>
                )}
                {ipInfo.country && (
                  <div className="info-item">
                    <span className="info-label">Country:</span>
                    <span className="info-value">{ipInfo.country}</span>
                  </div>
                )}
                {ipInfo.loc && (
                  <div className="info-item">
                    <span className="info-label">Location:</span>
                    <span className="info-value">{ipInfo.loc}</span>
                  </div>
                )}
                {ipInfo.org && (
                  <div className="info-item">
                    <span className="info-label">Organization:</span>
                    <span className="info-value">{ipInfo.org}</span>
                  </div>
                )}
                {ipInfo.postal && (
                  <div className="info-item">
                    <span className="info-label">Postal Code:</span>
                    <span className="info-value">{ipInfo.postal}</span>
                  </div>
                )}
                {ipInfo.timezone && (
                  <div className="info-item">
                    <span className="info-label">Timezone:</span>
                    <span className="info-value">{ipInfo.timezone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="search-section">
              <form onSubmit={handleIpSubmit} className="ip-form">
                <div className="input-group">
                  <input
                    type="text"
                    value={inputIp}
                    onChange={(e) => {
                      setInputIp(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter IP address (e.g., 8.8.8.8)"
                    className="ip-input"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading} className="search-button">
                    {loading ? 'Loading...' : 'Search'}
                  </button>
                  <button type="button" onClick={handleClear} className="clear-button">
                    Clear
                  </button>
                </div>
                {error && <div className="error-message">{String(error)}</div>}
              </form>
            </div>

            <div className="history-map-grid">
              <div className="history-section">
                <div className="history-header">
                  <div className="history-header-left">
                    <h2>Search History</h2>
                    {history.length > 0 && (
                      <label className="select-all-label">
                        <input
                          type="checkbox"
                          checked={selectedHistory.length === history.length}
                          onChange={handleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Select All</span>
                      </label>
                    )}
                  </div>
                  {selectedHistory.length > 0 && (
                    <button onClick={handleDeleteSelected} className="delete-button">
                      Delete ({selectedHistory.length})
                    </button>
                  )}
                </div>
                {history.length > 0 ? (
                  <div className="history-list">
                    {history.map((item, index) => (
                      <div 
                        key={`${item.id || item.ip}-${index}`} 
                        className={`history-item ${selectedHistory.includes(item.id) ? 'selected' : ''} ${activeIpId === item.id ? 'active' : ''}`}
                      >
                        <div className="history-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={selectedHistory.includes(item.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleHistoryCheckbox(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div 
                          className="history-content"
                          onClick={() => handleHistoryClick(item)}
                        >
                          <div className="history-ip">{item.ip}</div>
                          <div className="history-location">
                            {item.city}, {item.region}, {item.country}
                          </div>
                          <div className="history-time">
                            {new Date(item.created_at || item.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty">
                    <p>No search history</p>
                  </div>
                )}
              </div>

              <div className={`map-card ${activeIpId ? 'active' : ''}`}>
                <h2>Location Map</h2>
                <IPMap ipInfo={ipInfo} />
              </div>
            </div>
          </>
        )}

        {!ipInfo && (
          <div className="history-section">
            <div className="history-header">
              <div className="history-header-left">
                <h2>Search History</h2>
                {history.length > 0 && (
                  <label className="select-all-label">
                    <input
                      type="checkbox"
                      checked={selectedHistory.length === history.length}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>Select All</span>
                  </label>
                )}
              </div>
              {selectedHistory.length > 0 && (
                <button onClick={handleDeleteSelected} className="delete-button">
                  Delete ({selectedHistory.length})
                </button>
              )}
            </div>
            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item, index) => (
                  <div 
                    key={`${item.id || item.ip}-${index}`} 
                    className={`history-item ${selectedHistory.includes(item.id) ? 'selected' : ''} ${activeIpId === item.id ? 'active' : ''}`}
                  >
                    <div className="history-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={selectedHistory.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleHistoryCheckbox(item.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div 
                      className="history-content"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="history-ip">{item.ip}</div>
                      <div className="history-location">
                        {item.city}, {item.region}, {item.country}
                      </div>
                      <div className="history-time">
                        {new Date(item.created_at || item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="history-empty">
                <p>No search history</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

