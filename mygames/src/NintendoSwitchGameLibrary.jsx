import React, { useState, useEffect, useRef } from 'react';
import './NintendoSwitchGameLibrary.css';

const NintendoSwitchGameLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const API_URL = 'http://localhost:3001/games';
  
  // Get credentials from environment variables
  const IGDB_CLIENT_ID = import.meta.env.VITE_IGDB_CLIENT_ID;
  const IGDB_CLIENT_SECRET = import.meta.env.VITE_IGDB_CLIENT_SECRET;
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    console.log('Environment variables:', {
      hasClientId: !!IGDB_CLIENT_ID,
      hasClientSecret: !!IGDB_CLIENT_SECRET,
      clientId: IGDB_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: IGDB_CLIENT_SECRET ? 'Set' : 'Not set'
    });
    
    fetchGames();
    if (IGDB_CLIENT_ID && IGDB_CLIENT_SECRET) {
      getAccessToken();
    } else {
      setApiStatus('no_credentials');
    }
  }, []);

  // Close dropdown when clicking outside
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
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setGames(data);
      setError(null);
    } catch (err) {
      console.error('Could not fetch game data:', err);
      setError('Could not connect to database. Please check that JSON Server is running.');
    } finally {
      setLoading(false);
    }
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
  if (!query.trim() || !accessToken || !IGDB_CLIENT_ID) {
    console.log('Cannot search - missing requirements');
    setSearchResults([]);
    setShowDropdown(false);
    return [];
  }

  try {
    setSearching(true);
    console.log('Searching for:', query);
    
    // Try multiple query approaches to get better results
    const queries = [
      // Original query - most restrictive
      `fields id, name, first_release_date, platforms, cover.*;
       search "${query}";
       where category = 0 & platforms = (130);
       limit 10;`,
      
      // Broader search - include more platforms and don't filter by category
      `fields id, name, first_release_date, platforms, cover.*;
       search "${query}";
       where platforms = (130, 48, 49, 41, 37, 33);
       limit 10;`,
      
      // Even broader - search all platforms but filter later
      `fields id, name, first_release_date, platforms, cover.*;
       search "${query}";
       where category = (0, 2, 3, 4);
       limit 15;`
    ];

    let searchData = [];
    
    // Try each query until we get results
    for (const queryBody of queries) {
      console.log('Trying query:', queryBody);
      
      const response = await fetch('http://localhost:3002/api/igdb/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: IGDB_CLIENT_ID,
          accessToken: accessToken,
          query: queryBody
        })
      });

      console.log('Search response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Query failed:', errorData);
        continue; // Try next query
      }

      const data = await response.json();
      console.log('Search results found:', data.length);
      
      if (data.length > 0) {
        searchData = data;
        break; // We found results, stop trying other queries
      }
    }

    // Filter to only include Nintendo Switch games if we got results from broader queries
    const nintendoSwitchGames = searchData.filter(game => 
      game.platforms && game.platforms.includes(130)
    );

    console.log('After Nintendo Switch filter:', nintendoSwitchGames.length);
    
    // If no Nintendo Switch games found, show all results and mark them
    const finalResults = nintendoSwitchGames.length > 0 ? nintendoSwitchGames : searchData;
    
    setSearchResults(finalResults);
    setShowDropdown(finalResults.length > 0);
    return finalResults;
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
  if (!accessToken || !IGDB_CLIENT_ID) return null;

  try {
    // Try artwork first
    const artworkResponse = await fetch('http://localhost:3002/api/igdb/artwork', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: IGDB_CLIENT_ID,
        accessToken: accessToken,
        query: `
          fields url;
          where game = ${gameId} & artwork_type = 3;
          limit 1;
        `
      })
    });

    if (artworkResponse.ok) {
      const artworkData = await artworkResponse.json();
      if (artworkData.length > 0) {
        const imageUrl = artworkData[0].url.replace('t_thumb', 't_1080p');
        return `https:${imageUrl}`;
      }
    }

    // Fallback to covers
    const coverResponse = await fetch('http://localhost:3002/api/igdb/covers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: IGDB_CLIENT_ID,
        accessToken: accessToken,
        query: `
          fields url;
          where game = ${gameId};
          limit 1;
        `
      })
    });

    if (coverResponse.ok) {
      const coverData = await coverResponse.json();
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
          imageUrl: imageUrl
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
        // If no game was selected from search, try to find it automatically
        let imageUrl = newGame.imageUrl;
        if (!selectedGame && !imageUrl && accessToken) {
          const searchResults = await searchGames(newGame.title);
          if (searchResults && searchResults.length > 0) {
            const firstResult = searchResults[0];
            imageUrl = await getGameArtwork(firstResult.id);
          }
        }

        const gameToAdd = {
          ...newGame,
          imageUrl: imageUrl || ''
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gameToAdd),
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        fetchGames();
        
        // Reset form
        setNewGame({
          title: "",
          completed: false,
          imageUrl: ""
        });
        setSelectedGame(null);
        setSearchResults([]);
      } catch (err) {
        console.error("Couldn't add game:", err);
        setError("Couldn't add game. Please check that the JSON server is running.");
      }
    } else {
      setError('Please add a game title.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveGame = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setGames(games.filter(game => game.id !== id));
    } catch (err) {
      console.error("Couldn't remove game:", err);
      setError("Couldn't remove game. Please check that the JSON server is running.");
    }
  };

  const toggleCompleted = async (id) => {
    try {
      const game = games.find(g => g.id === id);
      const updatedGame = { ...game, completed: !game.completed };
      
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGame),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      setGames(games.map(game => 
        game.id === id ? updatedGame : game
      ));
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
    
    if (sortConfig.key) {
      sortableGames.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
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
        return 'API credentials not found in .env file';
      case 'authenticating':
        return 'Authenticating with IGDB API...';
      case 'authenticated':
        return '✅ Successfully connected to IGDB API';
      case 'auth_failed':
        return '❌ Failed to authenticate with IGDB API';
      default:
        return '';
    }
  };

  return (
  <div className="container">
    <h1 className="main-title">My Nintendo Switch Game Library</h1>
    
    {/* Remove the old API status display and replace with subtle indicator */}
    {apiStatus === 'authenticated' && (
      <div className="api-status-indicator">
        <span className="api-status-dot"></span>
        <span className="api-status-text">Search enabled</span>
      </div>
    )}
    
    {apiStatus === 'no_credentials' && (
      <div className="api-status-indicator warning">
        <span className="api-status-dot"></span>
        <span className="api-status-text">
          Search disabled - <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer">Add API credentials</a>
        </span>
      </div>
    )}
    
    {apiStatus === 'auth_failed' && (
      <div className="api-status-indicator error">
        <span className="api-status-dot"></span>
        <span className="api-status-text">Search unavailable - Check API credentials</span>
      </div>
    )}
            
    {error && (
      <div className="error-message">
        <p>{error}</p>
        <button onClick={fetchGames} className="retry-button">Try again</button>
      </div>
    )}

    <div className="add-game-form">
      <h2>Add new game</h2>
      <div className="form-grid">
        <div className="form-group search-container" ref={dropdownRef}>
          {/* Keep your existing search input code exactly as is */}
          <div className="search-input-wrapper">
            <input 
              type="text" 
              name="title" 
              value={newGame.title} 
              onChange={handleSearchInputChange}
              placeholder="Start typing to search Nintendo Switch games..."
              className="search-input"
              disabled={apiStatus !== 'authenticated'}
            />
            {searching && <div className="search-spinner">🔍</div>}
            
            {/* Your existing dropdown code remains exactly the same */}
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
          
          {/* Status indicator positioned below the search input */}
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

        {/* <div className="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              name="completed" 
              checked={newGame.completed} 
              onChange={handleInputChange}
            />
            Completed
          </label>
        </div> */}
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
        <label>Sort by: </label>
        <select 
          value={sortConfig.key} 
          onChange={(e) => requestSort(e.target.value)}
          className="sort-select"
        >
          <option value="title">Title</option>
          <option value="completed">Status</option>
        </select>
        <button 
          onClick={() => requestSort(sortConfig.key)}
          className="sort-direction-button"
        >
          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
        </button>
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
                  <h3 className="game-title">{game.title}</h3>
                  <div 
                    className={`status-badge ${game.completed ? 'completed' : 'not-completed'}`}
                    onClick={() => toggleCompleted(game.id)}
                  >
                    {game.completed ? '✓ Completed' : '○ Playing'}
                  </div>
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

export default NintendoSwitchGameLibrary;