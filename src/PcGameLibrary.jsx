import { useState, useEffect, useRef } from 'react';
import './PcGameLibrary.css';
import { Link } from 'react-router-dom';

const PcGameLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searching, setSearching] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: 'title',
    direction: 'ascending'
  });

  const [newGame, setNewGame] = useState({
    title: "",
    completed: false,
    imageUrl: ""
  });

  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiReady, setApiReady] = useState(false);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const IGDB_CLIENT_ID = import.meta.env.VITE_IGDB_CLIENT_ID;
  const IGDB_CLIENT_SECRET = import.meta.env.VITE_IGDB_CLIENT_SECRET;
  const [accessToken, setAccessToken] = useState(null);

  const STORAGE_KEY = 'pc-games';

  useEffect(() => {
    console.log('Environment variables:', {
      hasClientId: !!IGDB_CLIENT_ID,
      hasClientSecret: !!IGDB_CLIENT_SECRET,
      clientId: IGDB_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: IGDB_CLIENT_SECRET ? 'Set' : 'Not set'
    });
    
    fetchGames();
  if (IGDB_CLIENT_ID) {
    setApiReady(true);
    setApiStatus('authenticated');
  } else {
    setApiStatus('no_credentials');
  }
}, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const storedGames = localStorage.getItem(STORAGE_KEY);
      if (storedGames) {
        const data = JSON.parse(storedGames);
        setGames(data);
      }
      setError(null);
    } catch (err) {
      console.error('Could not fetch game data:', err);
      setError('Could not load games from storage.');
    } finally {
      setLoading(false);
    }
  };

  const saveGames = (gamesArray) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gamesArray));
      setGames(gamesArray);
    } catch (err) {
      console.error('Could not save games:', err);
      setError('Could not save games to storage.');
    }
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Get access token from Twitch
  const getAccessToken = async () => {
    if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
      console.error('Missing IGDB credentials in environment variables');
      setApiStatus('no_credentials');
      return;
    }

    try {
      console.log('Attempting to get access token...');
      setApiStatus('authenticating');
      
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: IGDB_CLIENT_ID,
          client_secret: IGDB_CLIENT_SECRET,
          grant_type: 'client_credentials'
        })
      });

      console.log('Token response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token request failed:', response.status, errorText);
        setApiStatus('auth_failed');
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Access token received:', data.access_token ? 'Yes' : 'No');
      setAccessToken(data.access_token);
      setApiStatus('authenticated');
      console.log('Successfully authenticated with IGDB API');
    } catch (err) {
      console.error('Error getting access token:', err);
      setApiStatus('auth_failed');
      setError('Failed to authenticate with game database. Check your API credentials.');
    }
  };

  const searchGames = async (query) => {
  if (!query.trim()) {
    setSearchResults([]);
    setShowDropdown(false);
    return [];
  }

  try {
    setSearching(true);
    
    const response = await fetch('/.netlify/functions/igdb-search-pc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerm: query
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Search failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Show whatever results we get
    setSearchResults(data);
    setShowDropdown(data.length > 0);
    return data;
  } catch (err) {
    console.error('Error searching games:', err);
    setError(`Search failed: ${err.message}`);
    setSearchResults([]);
    setShowDropdown(false);
    return [];
  } finally {
    setSearching(false);
  }
};

const getGameArtwork = async (gameId) => {
  try {
    const response = await fetch('/.netlify/functions/igdb-covers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          fields url;
          where game = ${gameId};
          limit 1;
        `
      })
    });

    if (response.ok) {
      const coverData = await response.json();
      if (coverData.length > 0) {
        const coverUrl = coverData[0].url.replace('t_thumb', 't_cover_big');
        return `https:${coverUrl}`;
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching game artwork:', err);
    return null;
  }
};

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    console.log('Input changed:', value);
    
    setNewGame({ 
      ...newGame, 
      title: value 
    });
    
    // Clear selection if user starts typing again
    if (selectedGame && value !== selectedGame.name) {
      setSelectedGame(null);
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Search after a short delay to avoid too many API calls
    if (value.length > 2) {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        console.log('Executing search for:', value);
        searchGames(value);
      }, 500);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setSearching(false);
    }
  };

  const handleGameSelect = async (game) => {
  console.log('Selected game:', game);
  setSelectedGame(game);
  setNewGame({
    ...newGame,
    title: game.name
  });
  setShowDropdown(false);
  
  // Fetch artwork for the selected game
  if (game.id) {
    const imageUrl = await getGameArtwork(game.id);
    console.log('Artwork result:', imageUrl);
    if (imageUrl) {
      setNewGame(prev => ({
        ...prev,
        imageUrl: imageUrl,
        // Store the release date if available
        releaseDate: game.first_release_date
      }));
    } else {
      // Still store release date even if no artwork
      setNewGame(prev => ({
        ...prev,
        releaseDate: game.first_release_date
      }));
    }
  }
};

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewGame({ 
      ...newGame, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleAddGame = async () => {
  if (newGame.title.trim()) {
    try {
      let imageUrl = newGame.imageUrl;
      let releaseDate = newGame.releaseDate;
      
      // If no game was selected from search, try to find it automatically
      if (!selectedGame && !imageUrl && accessToken) {
        const searchResults = await searchGames(newGame.title);
        if (searchResults && searchResults.length > 0) {
          const firstResult = searchResults[0];
          imageUrl = await getGameArtwork(firstResult.id);
          releaseDate = firstResult.first_release_date;
        }
      }

      const gameToAdd = {
        id: generateId(),
        title: newGame.title,
        completed: newGame.completed,
        imageUrl: imageUrl || '',
        first_release_date: releaseDate || null
      };

      // Add to localStorage
      const updatedGames = [...games, gameToAdd];
      saveGames(updatedGames);
      
      // Reset form
      setNewGame({
        title: "",
        completed: false,
        imageUrl: "",
        releaseDate: null
      });
      setSelectedGame(null);
      setSearchResults([]);
    } catch (err) {
      console.error("Couldn't add game:", err);
      setError("Couldn't add game.");
    }
  } else {
    setError('Please add a game title.');
    setTimeout(() => setError(null), 3000);
  }
};

  const handleRemoveGame = async (id) => {
    try {
      const updatedGames = games.filter(game => game.id !== id);
      saveGames(updatedGames);
    } catch (err) {
      console.error("Couldn't remove game:", err);
      setError("Couldn't remove game.");
    }
  };

  const toggleCompleted = async (id) => {
    try {
      const updatedGames = games.map(game => 
        game.id === id ? { ...game, completed: !game.completed } : game
      );
      saveGames(updatedGames);
    } catch (err) {
      console.error("Couldn't update game:", err);
      setError("Couldn't update game status.");
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedGames = () => {
  let sortableGames = [...games];
  
  if (sortConfig.key === 'release_date') {
    // Special handling for release date (handles null/missing dates)
    sortableGames.sort((a, b) => {
      const dateA = a.first_release_date || 0;
      const dateB = b.first_release_date || 0;
      
      if (dateA < dateB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (dateA > dateB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  } else if (sortConfig.key) {
    // Existing sorting logic for title and status
    sortableGames.sort((a, b) => {
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];
      
      // Handle undefined/null values
      if (valueA == null && valueB != null) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valueA != null && valueB == null) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      if (valueA == null && valueB == null) {
        return 0;
      }
      
      // For status (completed), treat true as "higher" than false
      if (sortConfig.key === 'completed') {
        if (valueA === valueB) return 0;
        if (valueA && !valueB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        if (!valueA && valueB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
      }
      
      // For strings (title)
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortConfig.direction === 'ascending' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // For numbers or other types
      if (valueA < valueB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }
  
  return sortableGames;
};

  const formatYear = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).getFullYear();
  };

  const getApiStatusMessage = () => {
    switch (apiStatus) {
      case 'checking':
        return 'Checking API configuration...';
      case 'no_credentials':
        return 'API credentials not found';
      case 'authenticating':
        return 'Authenticating with IGDB API...';
      case 'authenticated':
        return 'Search enabled';
      case 'auth_failed':
        return 'Failed to authenticate with IGDB API';
      default:
        return '';
    }
  };

  // Export/Import functionality
  const exportGames = () => {
  const dataStr = JSON.stringify(games, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  const exportFileDefaultName = `pc-games-backup-${dateString}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  setSuccess(`${games.length} games exported successfully!`);
  setTimeout(() => setSuccess(null), 3000);
};

  const importGames = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedGames = JSON.parse(e.target.result);
          if (Array.isArray(importedGames)) {
            saveGames(importedGames);
            setSuccess('Games imported successfully!');
            setTimeout(() => setSuccess(null), 3000);
          } else {
            setError('Invalid file format');
          }
        } catch (err) {
          setError('Error reading file');
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  };

  const formatReleaseYear = (timestamp) => {
  if (!timestamp) return 'TBA';
  
  // IGDB timestamps are in seconds, JavaScript Date uses milliseconds
  const date = new Date(timestamp * 1000);
  return date.getFullYear();
};

const formatFullDate = (timestamp) => {
  if (!timestamp) return 'TBA';
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

  return (
    <div className="container">
      <div className="page-navigation">
      <Link to="/" className="nav-button">← Nintendo Switch Games</Link>
    </div>
      <h1 className="main-title">My PC Game Library</h1>
      <p>(Steam, Epic Games Store, GOG, etc.)</p>
    <div className="app-description">
      <p>Track your PC game collection, mark completed titles, and automatically fetch beautiful box art. Your library saves directly in your browser - no account needed!</p>
    </div>
            
      {(error || success) && (
        <div className={`message ${error ? 'error' : 'success'}`}>
          <p>{error || success}</p>
          {error && <button onClick={fetchGames} className="retry-button">Try again</button>}
        </div>
      )}

      <div className="add-game-form">
        <div className="form-grid">
          <div className="form-group search-container" ref={dropdownRef}>
            <div className="search-input-wrapper">
              <input 
                type="text" 
                name="title" 
                value={newGame.title} 
                onChange={handleSearchInputChange}
                placeholder="Start typing to search for games..."
                className="search-input"
                disabled={!apiReady}
              />
              {searching && <div className="search-spinner">🔍</div>}
              
              {showDropdown && searchResults.length > 0 && (
                <div className="search-dropdown">
                  {searchResults.map((game) => (
                    <div 
                      key={game.id} 
                      className="search-result-item"
                      onClick={() => handleGameSelect(game)}
                    >
                      <div className="search-result-image">
                        {game.cover ? (
                          <img 
                            src={`https:${game.cover.url.replace('t_thumb', 't_cover_small')}`} 
                            alt={game.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="no-search-image" style={{ display: game.cover ? 'none' : 'flex' }}>
                          No Image
                        </div>
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{game.name}</div>
                        {game.first_release_date && (
                          <div className="search-result-year">
                            {new Date(game.first_release_date * 1000).getFullYear()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="search-status-area">
              {apiStatus === 'authenticating' && (
                <div className="search-status-message authenticating">
                  <span className="status-pulse"></span>
                  Connecting to game database...
                </div>
              )}
              
              {selectedGame && (
                <div className="selected-game-info">
                  ✓ Selected: <strong>{selectedGame.name}</strong>
                  {newGame.imageUrl && <span> (Artwork loaded)</span>}
                </div>
              )}
              
              {apiStatus !== 'authenticated' && newGame.title.length > 2 && (
                <div className="search-disabled-message">
                  Search disabled - {getApiStatusMessage()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-help">
          <p>
            {apiStatus === 'authenticated' 
              ? ""
              : "Search disabled. Add API credentials to enable game search."
            }
          </p>
        </div>

        <button 
          onClick={handleAddGame}
          className="add-game-button"
          disabled={loading || searching || !newGame.title.trim()}
        >
          {searching ? 'Searching...' : loading ? 'Loading...' : 'Add Game'}
        </button>
      </div>
      
      <div className="sort-controls">
        <div className="counter-mini">
          <span className="counter-mini-number">{games.length}</span>
          <span className="counter-mini-text">games</span>
        </div>
        
        <label>Sort by: </label>
        <select 
          value={sortConfig.key} 
          onChange={(e) => requestSort(e.target.value)}
          className="sort-select"
        >
          <option value="title">Title</option>
          <option value="completed">Status</option>
          <option value="release_date">Release Year</option>
        </select>
        <button 
          onClick={() => requestSort(sortConfig.key)}
          className="sort-direction-button"
        >
          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
        </button>
        
        
        {games.length > -1 && (
        <div className="backup-controls">
          <button onClick={exportGames} className="backup-button">
            Export backup
          </button>
          <label className="import-button">
            Import existing backup
            <input 
              type="file" 
              accept=".json" 
              onChange={importGames}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}
        
      </div>

      <div className="games-grid-container">
        {loading ? (
          <div className="loading">Loading games...</div>
        ) : (
          <div className="games-grid">
            {getSortedGames().map(game => (
              <div 
                key={game.id} 
                className={`game-card ${game.completed ? 'completed' : ''}`}
              >
                <div className="game-image-container">
                  {game.imageUrl ? (
                    <img 
                      src={game.imageUrl} 
                      alt={`${game.title} cover`} 
                      className="game-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="no-image-placeholder"
                    style={{ display: game.imageUrl ? 'none' : 'flex' }}
                  >
                    No Image
                  </div>
                  
                  <div className="game-overlay">
                    <button 
                      onClick={() => handleRemoveGame(game.id)}
                      className="gallery-remove-button"
                      title="Remove game"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="game-info">
                  <div className="game-header">
                    <h3 className="game-title">{game.title}</h3>
                    {game.first_release_date && (
                      <span className="game-year-corner">
                        {formatReleaseYear(game.first_release_date)}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleCompleted(game.id)}
                    className={`completion-toggle ${game.completed ? 'completed' : 'not-completed'}`}
                  >
                    {game.completed ? (
                      <>
                        <span className="toggle-icon">✓ </span>
                        Completed
                      </>
                    ) : (
                      <>
                        <span className="toggle-icon">○ </span>
                        Mark Complete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            
            {games.length === 0 && !loading && (
              <div className="empty-grid">
                <p>No games added yet.</p>
                <p>Add your first game above!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PcGameLibrary;