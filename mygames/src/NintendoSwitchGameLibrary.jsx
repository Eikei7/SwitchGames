import React, { useState, useEffect } from 'react';
import './NintendoSwitchGameLibrary.css';

const NintendoSwitchGameLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestVersions, setLatestVersions] = useState({});
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'ascending'
  });

  const [newGame, setNewGame] = useState({
    name: "",
    version: "",
    imageUrl: "",
    titleId: ""
  });

  const API_URL = 'http://localhost:3000/games';

  const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/16BitWonder/nx-versions/master/versions.txt';

  function convertVersionNumberToReadable(numericVersion) {
    const versionNum = parseInt(numericVersion, 10);
    
    if (isNaN(versionNum)) {
      return numericVersion;
    }
    
    const version = versionNum / 65536;
    
    if (version === Math.floor(version)) {
      return version.toString();
    }
    
    return version.toFixed(1);
  }

  useEffect(() => {
    fetchGames();
    fetchLatestVersions();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP-fel ${response.status}`);
      }
      
      const data = await response.json();
      setGames(data);
      setError(null);
    } catch (err) {
      console.error('Kunde inte hämta speldata:', err);
      setError('Kunde inte ansluta till databasen. Kontrollera att JSON Server är igång.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestVersions = async () => {
    try {
      setLoadingVersions(true);
      const response = await fetch(GITHUB_RAW_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP-fel ${response.status}`);
      }
      
      const text = await response.text();
      
      const versionMap = {};
      const lines = text.split('\n');
      
      lines.forEach(line => {
        if (line && line.includes('|')) {
          const [titleId, version] = line.split('|');
          if (titleId && version) {
            versionMap[titleId.trim()] = version.trim();
          }
        }
      });
      
      setLatestVersions(versionMap);
    } catch (err) {
      console.error('Kunde inte hämta senaste versioner:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const needsUpdate = (game) => {
    if (!game.titleId || !latestVersions[game.titleId]) {
      return false;
    }
    
    return game.version !== latestVersions[game.titleId];
  };

  const getLatestVersion = (titleId) => {
    if (!titleId || !latestVersions[titleId]) {
      return 'Okänd';
    }
    
    return latestVersions[titleId];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGame({ ...newGame, [name]: value });
  };

  const handleAddGame = async () => {
    if (newGame.name && newGame.version) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newGame),
        });

        if (!response.ok) {
          throw new Error(`HTTP-fel ${response.status}`);
        }

        fetchGames();
        
        setNewGame({
          name: "",
          version: "",
          imageUrl: "",
          titleId: ""
        });
      } catch (err) {
        console.error("Couldn't add game:", err);
        setError("Couldn't add game: Please check that the JSON server is running.");
      }
    } else {
      setError('Please add both title and version.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveGame = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP-fel ${response.status}`);
      }

      setGames(games.filter(game => game.id !== id));
    } catch (err) {
      console.error("Couldn't remove game:", err);
      setError("Couldn't remove game. Please check that the JSON server is running.");
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

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <div className="container">
      <h1 className="main-title">Nintendo Switch Game Library</h1>
      
      <div className="version-control">
        <button 
          onClick={fetchLatestVersions} 
          className="update-versions-button"
          disabled={loadingVersions}
        >
          {loadingVersions ? 'Fetching versions...' : 'Update versions from txt file'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchGames} className="retry-button">Try again</button>
        </div>
      )}
      
      <div className="table-container">
        {loading ? (
          <div className="loading">Loading data...</div>
        ) : (
          <table className="game-table">
            <thead>
              <tr>
                <th>Image</th>
                <th 
                  className="sortable-header" 
                  onClick={() => requestSort('name')}
                >
                  Title {getSortIndicator('name')}
                </th>
                <th>Your version</th>
                <th>Latest version</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedGames().map(game => (
                <tr key={game.id}>
                  <td>
                    {game.imageUrl ? (
                      <img 
                        src={game.imageUrl} 
                        alt={`${game.name} cover`} 
                        className="game-image"
                      />
                    ) : (
                      <div className="no-image">
                        No image
                      </div>
                    )}
                  </td>
                  <td className="game-name">{game.name}</td>
                  <td>{game.version}</td>
                  <td>{getLatestVersion(game.titleId)}</td>
                  <td>
                    {!game.titleId ? (
                      <span className="unknown-status">No Title ID</span>
                    ) : !latestVersions[game.titleId] ? (
                      <span className="unknown-status">Unknown</span>
                    ) : needsUpdate(game) ? (
                      <a 
                        href={`https://www.ziperto.com/?s=${encodeURIComponent(game.name.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="update-needed"
                      >
                        Update available
                      </a>
                    ) : (
                      <span className="up-to-date">Up-to-date</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleRemoveGame(game.id)}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {games.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="empty-table">
                    No games added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="add-game-form">
        <h2>Lägg till nytt spel</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              name="name" 
              value={newGame.name} 
              onChange={handleInputChange}
              placeholder="e.g. Super Mario Odyssey"
            />
          </div>
          
          <div className="form-group">
            <label>Version</label>
            <input 
              type="text" 
              name="version" 
              value={newGame.version} 
              onChange={handleInputChange}
              placeholder="e.g. 393216"
            />
          </div>

          <div className="form-group">
            <label>Title ID</label>
            <input 
              type="text" 
              name="titleId" 
              value={newGame.titleId} 
              onChange={handleInputChange}
              placeholder="e.g. 0100000000010000"
            />
          </div>

          <div className="form-group">
            <label>Image</label>
            <input 
              type="text" 
              name="imageUrl" 
              value={newGame.imageUrl} 
              onChange={handleInputChange}
              placeholder="https://example.com/boxart.jpg"
            />
          </div>
        </div>

        <button 
          onClick={handleAddGame}
          className="add-game-button"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Add game'}
        </button>
      </div>
      <p><a href="https://raw.githubusercontent.com/16BitWonder/nx-versions/master/versions.txt">afa</a></p>
      <p><a href="https://www.eliboa.com/switch/nsw_titles.php">Box art URL's found here</a></p>
    </div>
  );
};

export default NintendoSwitchGameLibrary;