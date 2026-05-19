import './NintendoSwitchGameLibrary.css';
import { Link } from 'react-router-dom';
import { useGameLibrary, formatReleaseYear } from './hooks/useGameLibrary';

const NintendoSwitchGameLibrary = () => {
  const {
    games,
    loading,
    error,
    success,
    searching,
    viewMode,
    setViewMode,
    sortConfig,
    newGame,
    searchResults,
    showDropdown,
    selectedGame,
    apiStatus,
    apiReady,
    dropdownRef,
    sortedGames,
    fetchGames,
    handleSearchInputChange,
    handleGameSelect,
    handleAddGame,
    handleRemoveGame,
    toggleCompleted,
    requestSort,
    exportGames,
    importGames,
    apiStatusMessage,
  } = useGameLibrary('nintendo-switch-games', '/.netlify/functions/igdb-search');

  const exportFilename = `nintendo-games-backup-${new Date().toISOString().split('T')[0]}.json`;

  return (
    <div className="container">
      <div className="page-navigation">
      <Link to="/pc" className="nav-button">PC Games →</Link>
    </div>
      <h1 className="main-title">My Nintendo Switch Game Library</h1>
    <div className="app-description">
      <p>Track your Nintendo Switch game collection, mark completed titles, and automatically fetch beautiful box art. Your library saves directly in your browser - no account needed!</p>
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
                  {searchResults.map((game) => {
                    const alreadyAdded = games.some(g => g.title.toLowerCase() === game.name.toLowerCase());
                    return (
                    <div 
                      key={game.id} 
                      className={`search-result-item${alreadyAdded ? ' already-added' : ''}`}
                      onClick={() => !alreadyAdded && handleGameSelect(game)}
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
                    );
                  })}
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
                  Search disabled - {apiStatusMessage}
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

        <div className="sort-controls-right">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ≡
            </button>
          </div>

          {games.length > 0 && (
            <div className="backup-controls">
              <button onClick={() => exportGames(exportFilename)} className="backup-button">
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
        
      </div>

      <div className="games-grid-container">
        {loading ? (
          <div className="loading">Loading games...</div>
        ) : viewMode === 'grid' ? (
          <div className="games-grid">
            {sortedGames.map(game => (
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
                      loading="lazy"
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
                      <span className="game-year-corner-switch">
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
        ) : (
          /* LIST VIEW */
          <div className="games-list">
            {sortedGames.length === 0 && !loading ? (
              <div className="empty-grid">
                <p>No games added yet.</p>
                <p>Add your first game above!</p>
              </div>
            ) : (
              <>
                <div className="list-header">
                  <div className="list-col-cover"></div>
                  <div className="list-col-title">Title</div>
                  <div className="list-col-year">Year</div>
                  <div className="list-col-status">Status</div>
                  <div className="list-col-actions"></div>
                </div>
                {sortedGames.map((game, index) => (
                  <div
                    key={game.id}
                    className={`list-row ${game.completed ? 'completed' : ''}`}
                    style={{ '--row-index': index }}
                  >
                    <div className="list-col-cover">
                      {game.imageUrl ? (
                        <img
                          src={game.imageUrl}
                          alt={`${game.title} cover`}
                          className="list-cover-img"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="list-no-cover"
                        style={{ display: game.imageUrl ? 'none' : 'flex' }}
                      >
                        ?
                      </div>
                    </div>

                    <div className="list-col-title">
                      <span className="list-game-title">{game.title}</span>
                    </div>

                    <div className="list-col-year">
                      {game.first_release_date
                        ? formatReleaseYear(game.first_release_date)
                        : <span className="list-no-data">—</span>
                      }
                    </div>

                    <div className="list-col-status">
                      <button
                        onClick={() => toggleCompleted(game.id)}
                        className={`list-status-badge ${game.completed ? 'completed' : 'not-completed'}`}
                      >
                        {game.completed ? '✓ Completed' : '○ Backlog'}
                      </button>
                    </div>

                    <div className="list-col-actions">
                      <button
                        onClick={() => handleRemoveGame(game.id)}
                        className="list-remove-button"
                        title="Remove game"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NintendoSwitchGameLibrary;