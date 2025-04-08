import React, { useState, useEffect } from 'react';
import './NintendoSwitchGameLibrary.css';

const NintendoSwitchGameLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ny speldetalj för att lägga till i listan
  const [newGame, setNewGame] = useState({
    name: "",
    version: "",
    imageUrl: ""
  });

  // API-basadress för JSON Server
  const API_URL = 'http://localhost:3001/games';

  // Hämta speldata från JSON Server när komponenten laddas
  useEffect(() => {
    fetchGames();
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
          imageUrl: ""
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

  return (
    <div className="container">
      <h1 className="main-title">Mitt Nintendo Switch Spelbibliotek</h1>
      
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
                <th>Spelnamn</th>
                <th>Version</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
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
                  <td colSpan="4" className="empty-table">
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