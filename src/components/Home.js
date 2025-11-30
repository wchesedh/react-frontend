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
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
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
    const initializeData = async () => {
      setInitialLoading(true);
      try {
        // Load history first
        await loadHistory();
        // Then fetch user's IP without saving to history
        await fetchIpInfo('', null, true, true); // Skip loading and skip history save
      } finally {
        setInitialLoading(false);
      }
    };
    initializeData();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/ip-history');
      // Ensure all items have proper structure
      const cleanHistory = (response.data || []).map(item => ({
        id: item.id,
        ip: item.ip,
        city: item.city || 'Unknown',
        region: item.region || 'Unknown',
        country: item.country || 'Unknown',
        loc: item.loc,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setHistory(cleanHistory);
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
          // Find item by IP (works for both temp ID and existing items)
          const existingIndex = prev.findIndex(item => item.ip === historyItem.ip);
          if (existingIndex >= 0) {
            const updated = [...prev];
            // Only update if we're replacing a temp ID or if IDs match
            const currentItem = updated[existingIndex];
            const isTempId = typeof currentItem.id === 'number' && currentItem.id >= 1000000000000;
            
            if (isTempId || currentItem.id === response.data.id) {
              updated[existingIndex] = {
                ...currentItem,
                id: response.data.id, // Always use real ID from database
                created_at: currentItem.created_at || new Date().toISOString(),
              };
              return updated;
            }
          }
          return prev;
        });
        
        // Update active IP ID if it was a temporary one
        setActiveIpId(prevId => {
          if (typeof prevId === 'number' && prevId >= 1000000000000) {
            // It's a temp ID, check if it matches the item we just saved
            const tempItem = history.find(item => item.id === prevId && item.ip === historyItem.ip);
            if (tempItem) {
              return response.data.id;
            }
          }
          return prevId;
        });
      } else if (response.data && response.data.message === 'History updated' && response.data.id) {
        // Item was updated (existing item), update the ID in state
        setHistory(prev => {
          const existingIndex = prev.findIndex(item => item.ip === historyItem.ip);
          if (existingIndex >= 0) {
            const updated = [...prev];
            // Update with real ID if it was a temp ID
            const currentItem = updated[existingIndex];
            const isTempId = typeof currentItem.id === 'number' && currentItem.id >= 1000000000000;
            if (isTempId || !currentItem.id) {
              updated[existingIndex] = {
                ...currentItem,
                id: response.data.id,
              };
              return updated;
            }
          }
          return prev;
        });
        
        // Update active IP ID if it was a temporary one
        setActiveIpId(prevId => {
          if (typeof prevId === 'number' && prevId >= 1000000000000) {
            const tempItem = history.find(item => item.id === prevId && item.ip === historyItem.ip);
            if (tempItem) {
              return response.data.id;
            }
          }
          return prevId;
        });
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

  const fetchIpInfo = async (ip = '', historyItemId = null, skipLoading = false, skipHistorySave = false) => {
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
        
        // Only add to history if not skipping history save and not from history click
        if (!skipHistorySave && !historyItemId) {
          const tempId = Date.now(); // Temporary ID until API responds
          
          setHistory(prev => {
            const existingIndex = prev.findIndex(item => item.ip === historyItem.ip);
            
            if (existingIndex >= 0) {
              // Update existing item in place (don't move to top)
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...historyItem,
                updated_at: new Date().toISOString(),
              };
              // Set active ID to the existing item's ID
              setActiveIpId(updated[existingIndex].id);
              return updated;
            } else {
              // Add new item at the beginning
              const newHistoryItem = {
                id: tempId,
                ...historyItem,
                created_at: new Date().toISOString(),
              };
              setActiveIpId(tempId);
              return [newHistoryItem, ...prev];
            }
          });
          
          // Save to API in background and update with real ID
          saveHistoryToAPI(historyItem).catch(err => console.error('History save error:', err));
        } else if (historyItemId) {
          // From history click, just set active ID
          setActiveIpId(historyItemId);
        } else if (skipHistorySave) {
          // Initial load - don't set active ID, just display the IP info
          setActiveIpId(null);
        }
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
    // Only select items with valid database IDs (not temporary IDs)
    const validItems = history.filter(item => item.id && typeof item.id === 'number' && item.id < 1000000000000);
    const validIds = validItems.map(item => item.id);
    
    // Check if all valid items are selected
    const allSelected = validIds.length > 0 && validIds.every(id => selectedHistory.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedHistory([]);
    } else {
      // Select all valid items
      setSelectedHistory(validIds);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHistory.length === 0 || deleting) return;
    
    // Filter out temporary IDs (timestamps) - only delete items with real database IDs
    const validIds = selectedHistory.filter(id => {
      // Real database IDs are typically smaller integers, temp IDs are timestamps (large numbers)
      return typeof id === 'number' && id < 1000000000000;
    });
    
    if (validIds.length === 0) {
      // All selected items are temporary, just remove them from state
      setHistory(prev => prev.filter(item => !selectedHistory.includes(item.id)));
      setSelectedHistory([]);
      return;
    }
    
    // Show confirmation alert
    const confirmMessage = validIds.length === 1
      ? 'Are you sure you want to delete this history item?'
      : `Are you sure you want to delete ${validIds.length} history item(s)?`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }
    
    setDeleting(true);
    
    // Get IPs of items being deleted for cleanup
    const itemsToDelete = history.filter(item => validIds.includes(item.id));
    const deletedIps = itemsToDelete.map(item => item.ip);
    const wasActiveIpDeleted = validIds.includes(activeIpId);
    
    try {
      // Delete from API
      await axios.delete('http://localhost:8000/api/ip-history', {
        data: { ids: validIds }
      });
      
      // Optimistically update state - remove deleted items immediately
      setHistory(prev => prev.filter(item => !validIds.includes(item.id)));
      setSelectedHistory([]);
      
      // Clear active IP if it was deleted
      if (wasActiveIpDeleted) {
        setActiveIpId(null);
        // If the deleted IP was currently displayed, fetch user's IP
        if (ipInfo && deletedIps.includes(ipInfo.ip)) {
          fetchIpInfo();
        }
      }
      
      // Reload history to ensure sync with server (in case of any discrepancies)
      await loadHistory();
    } catch (err) {
      console.error('Failed to delete history:', err);
      // Reload history on error to restore correct state
      await loadHistory();
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete history items';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to delete history items');
      alert('Failed to delete history items. Please try again.');
    } finally {
      setDeleting(false);
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

  // Show loading state until initial data is ready
  if (initialLoading) {
    return (
      <div className="home-container">
        <div className="home-header">
          <h1>IP Geolocation Lookup</h1>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
        <div className="home-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
                    {history.length > 0 && (() => {
                      const validItems = history.filter(item => item.id && typeof item.id === 'number' && item.id < 1000000000000);
                      const validIds = validItems.map(item => item.id);
                      const allSelected = validIds.length > 0 && validIds.every(id => selectedHistory.includes(id));
                      return (
                        <label className="select-all-label">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>Select All</span>
                        </label>
                      );
                    })()}
                  </div>
                  {selectedHistory.length > 0 && (
                    <button 
                      onClick={handleDeleteSelected} 
                      className="delete-button"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <span className="spinner-small"></span>
                          Deleting...
                        </>
                      ) : (
                        `Delete (${selectedHistory.length})`
                      )}
                    </button>
                  )}
                </div>
                {history.length > 0 ? (
                  <div className="history-list">
                    {history.map((item) => {
                      // Use stable key - prefer ID, fallback to IP if no ID yet
                      const itemKey = item.id ? `id-${item.id}` : `ip-${item.ip}`;
                      return (
                      <div 
                        key={itemKey}
                        className={`history-item ${selectedHistory.includes(item.id) ? 'selected' : ''} ${activeIpId === item.id ? 'active' : ''}`}
                      >
                        <div className="history-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={item.id && selectedHistory.includes(item.id)}
                            disabled={!item.id || (typeof item.id === 'number' && item.id >= 1000000000000)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (item.id) {
                                handleHistoryCheckbox(item.id);
                              }
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
                      );
                    })}
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
                {history.length > 0 && (() => {
                  const validItems = history.filter(item => item.id && typeof item.id === 'number' && item.id < 1000000000000);
                  const validIds = validItems.map(item => item.id);
                  const allSelected = validIds.length > 0 && validIds.every(id => selectedHistory.includes(id));
                  return (
                    <label className="select-all-label">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>Select All</span>
                    </label>
                  );
                })()}
              </div>
              {selectedHistory.length > 0 && (
                <button 
                  onClick={handleDeleteSelected} 
                  className="delete-button"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-small"></span>
                      Deleting...
                    </>
                  ) : (
                    `Delete (${selectedHistory.length})`
                  )}
                </button>
              )}
            </div>
            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => {
                  // Use stable key - prefer ID, fallback to IP if no ID yet
                  const itemKey = item.id ? `id-${item.id}` : `ip-${item.ip}`;
                  return (
                    <div 
                      key={itemKey}
                      className={`history-item ${selectedHistory.includes(item.id) ? 'selected' : ''} ${activeIpId === item.id ? 'active' : ''}`}
                    >
                      <div className="history-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={item.id && selectedHistory.includes(item.id)}
                          disabled={!item.id || (typeof item.id === 'number' && item.id >= 1000000000000)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (item.id) {
                              handleHistoryCheckbox(item.id);
                            }
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
                  );
                })}
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

