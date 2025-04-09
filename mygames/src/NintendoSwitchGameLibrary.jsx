import React, { useState, useEffect } from 'react';
import './NintendoSwitchGameLibrary.css';

const NintendoSwitchGameLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestVersions, setLatestVersions] = useState({});
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Sorteringstillstånd
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'ascending'
  });

  // Ny speldetalj för att lägga till i listan
  const [newGame, setNewGame] = useState({
    name: "",
    version: "",
    imageUrl: "",
    titleId: ""
  });

  // API-basadress för JSON Server
  const API_URL = 'http://localhost:3000/games';

  const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/16BitWonder/nx-versions/master/versions.txt';

  // Funktion för att konvertera numeriska versions-ID till läsbar version
  function convertVersionNumberToReadable(numericVersion) {
    const versionNum = parseInt(numericVersion, 10);
    
    if (isNaN(versionNum)) {
      return numericVersion;
    }
    
    // Dela med 65536 för att få versionsnumret enligt Nintendo-konventionen
    const version = versionNum / 65536;
    
    // Formatera för att undvika decimaltal om det är ett jämnt heltal
    if (version === Math.floor(version)) {
      return version.toString();
    }
    
    // Annars, visa med en decimal
    return version.toFixed(1);
  }

  // Hämta speldata från JSON Server när komponenten laddas
  useEffect(() => {
    fetchGames();
    fetchLatestVersions();
  }, []);

  // Funktion för att hämta spel
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

  // Funktion för att hämta senaste versioner från GitHub
  const fetchLatestVersions = async () => {
    try {
      setLoadingVersions(true);
      const response = await fetch(GITHUB_RAW_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP-fel ${response.status}`);
      }
      
      const text = await response.text();
      
      // Tolka versionsdata (format: [titleId]|[versionsNr])
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

  // Funktion för att kontrollera om ett spel behöver uppdateras
  const needsUpdate = (game) => {
    if (!game.titleId || !latestVersions[game.titleId]) {
      return false;
    }
    
    // Jämför versionssträng exakt med den numeriska versionen från GitHub
    return game.version !== latestVersions[game.titleId];
  };

  // Funktion för att få den senaste versionen
  const getLatestVersion = (titleId) => {
    if (!titleId || !latestVersions[titleId]) {
      return 'Okänd';
    }
    
    // Returnera endast det numeriska värdet
    return latestVersions[titleId];
  };

  // Hantera ändringar i ny spel-formuläret
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGame({ ...newGame, [name]: value });
  };

  // Lägg till nytt spel i databasen
  const handleAddGame = async () => {
    if (newGame.name && newGame.version) {
      try {
        // Skapa ett nytt spel via API
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

        // Hämta spel igen efter att ha lagt till ett nytt
        fetchGames();
        
        // Återställ formuläret
        setNewGame({
          name: "",
          version: "",
          imageUrl: "",
          titleId: ""
        });
      } catch (err) {
        console.error('Kunde inte lägga till spel:', err);
        setError('Kunde inte lägga till spel. Kontrollera att JSON Server är igång.');
      }
    } else {
      setError('Vänligen fyll i både spelnamn och version.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Ta bort spel från databasen
  const handleRemoveGame = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP-fel ${response.status}`);
      }

      // Uppdatera UI genom att ta bort spelet från state
      setGames(games.filter(game => game.id !== id));
    } catch (err) {
      console.error('Kunde inte ta bort spel:', err);
      setError('Kunde inte ta bort spel. Kontrollera att JSON Server är igång.');
    }
  };

  // Funktion för att sortera spel
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Funktion för att få sorterade spel
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

  // Funktion för att få sorteringsiklassnamn
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <div className="container">
      <h1 className="main-title">Nintendo Switch Spelbibliotek</h1>
      
      {/* Uppdateringsknapp för versioner */}
      <div className="version-control">
        <button 
          onClick={fetchLatestVersions} 
          className="update-versions-button"
          disabled={loadingVersions}
        >
          {loadingVersions ? 'Hämtar versioner...' : 'Uppdatera versioner från GitHub'}
        </button>
      </div>
      
      {/* Visa felmeddelande om något gick fel */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchGames} className="retry-button">Försök igen</button>
        </div>
      )}
      
      {/* Speldata tabell */}
      <div className="table-container">
        {loading ? (
          <div className="loading">Laddar speldata...</div>
        ) : (
          <table className="game-table">
            <thead>
              <tr>
                <th>Bild</th>
                <th 
                  className="sortable-header" 
                  onClick={() => requestSort('name')}
                >
                  Spelnamn {getSortIndicator('name')}
                </th>
                <th>Din version</th>
                <th>Senaste version</th>
                <th>Status</th>
                <th>Åtgärder</th>
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
                        Ingen bild
                      </div>
                    )}
                  </td>
                  <td className="game-name">{game.name}</td>
                  <td>{game.version}</td>
                  <td>{getLatestVersion(game.titleId)}</td>
                  <td>
                    {!game.titleId ? (
                      <span className="unknown-status">Inget Title ID</span>
                    ) : !latestVersions[game.titleId] ? (
                      <span className="unknown-status">Okänd</span>
                    ) : needsUpdate(game) ? (
                      <a 
                        href={`https://www.ziperto.com/?s=${encodeURIComponent(game.name.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="update-needed"
                      >
                        Uppdatering tillgänglig
                      </a>
                    ) : (
                      <span className="up-to-date">Uppdaterad</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleRemoveGame(game.id)}
                      className="remove-button"
                    >
                      Ta bort
                    </button>
                  </td>
                </tr>
              ))}
              {games.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="empty-table">
                    Inga spel har lagts till än
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulär för att lägga till nytt spel */}
      <div className="add-game-form">
        <h2>Lägg till nytt spel</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Spelnamn</label>
            <input 
              type="text" 
              name="name" 
              value={newGame.name} 
              onChange={handleInputChange}
              placeholder="t.ex. Super Mario Odyssey"
            />
          </div>
          
          <div className="form-group">
            <label>Version</label>
            <input 
              type="text" 
              name="version" 
              value={newGame.version} 
              onChange={handleInputChange}
              placeholder="t.ex. 1.3.0"
            />
          </div>

          <div className="form-group">
            <label>Title ID</label>
            <input 
              type="text" 
              name="titleId" 
              value={newGame.titleId} 
              onChange={handleInputChange}
              placeholder="t.ex. 0100000000010000"
            />
          </div>

          <div className="form-group">
            <label>Bild URL</label>
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
          {loading ? 'Laddar...' : 'Lägg till spel'}
        </button>
      </div>
    </div>
  );
};

export default NintendoSwitchGameLibrary;