import { useState, useEffect, useRef, useMemo } from 'react';

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

export const formatReleaseYear = (timestamp) => {
  if (!timestamp) return 'TBA';
  return new Date(timestamp * 1000).getFullYear();
};

const API_STATUS_MESSAGES = {
  checking: 'Checking API configuration...',
  no_credentials: 'API credentials not found',
  authenticating: 'Authenticating with IGDB API...',
  authenticated: 'Search enabled',
  auth_failed: 'Failed to authenticate with IGDB API',
};

export const useGameLibrary = (storageKey, searchEndpoint) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searching, setSearching] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'ascending' });
  const [newGame, setNewGame] = useState({ title: '', completed: false, imageUrl: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiReady, setApiReady] = useState(false);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const IGDB_CLIENT_ID = import.meta.env.VITE_IGDB_CLIENT_ID;

  useEffect(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(storageKey);
      if (stored) setGames(JSON.parse(stored));
      setError(null);
    } catch {
      setError('Could not load games from storage.');
    } finally {
      setLoading(false);
    }

    if (IGDB_CLIENT_ID) {
      setApiReady(true);
      setApiStatus('authenticated');
    } else {
      setApiStatus('no_credentials');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchGames = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(storageKey);
      setGames(stored ? JSON.parse(stored) : []);
      setError(null);
    } catch {
      setError('Could not load games from storage.');
    } finally {
      setLoading(false);
    }
  };

  const saveGames = (gamesArray) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(gamesArray));
      setGames(gamesArray);
    } catch {
      setError('Could not save games to storage.');
    }
  };

  const searchGamesApi = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return [];
    }
    try {
      setSearching(true);
      const response = await fetch(searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: query }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
      setShowDropdown(data.length > 0);
      return data;
    } catch (err) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `fields url; where game = ${gameId}; limit 1;`,
        }),
      });
      if (response.ok) {
        const covers = await response.json();
        if (covers.length > 0) {
          return `https:${covers[0].url.replace('t_thumb', 't_cover_big')}`;
        }
      }
    } catch { /* fall through to return null */ }
    return null;
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setNewGame(prev => ({ ...prev, title: value }));
    if (selectedGame && value !== selectedGame.name) setSelectedGame(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length > 2) {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(() => searchGamesApi(value), 500);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setSearching(false);
    }
  };

  const handleGameSelect = async (game) => {
    setSelectedGame(game);
    setNewGame(prev => ({ ...prev, title: game.name }));
    setShowDropdown(false);
    if (game.id) {
      const imageUrl = await getGameArtwork(game.id);
      setNewGame(prev => ({
        ...prev,
        imageUrl: imageUrl ?? prev.imageUrl,
        releaseDate: game.first_release_date,
      }));
    }
  };

  const handleAddGame = async () => {
    if (!newGame.title.trim()) {
      setError('Please add a game title.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      let { imageUrl, releaseDate } = newGame;
      if (!selectedGame && !imageUrl) {
        const results = await searchGamesApi(newGame.title);
        if (results.length > 0) {
          imageUrl = await getGameArtwork(results[0].id);
          releaseDate = results[0].first_release_date;
        }
      }
      saveGames([
        ...games,
        {
          id: generateId(),
          title: newGame.title,
          completed: newGame.completed,
          imageUrl: imageUrl || '',
          first_release_date: releaseDate || null,
        },
      ]);
      setNewGame({ title: '', completed: false, imageUrl: '', releaseDate: null });
      setSelectedGame(null);
      setSearchResults([]);
    } catch {
      setError("Couldn't add game.");
    }
  };

  const handleRemoveGame = (id) => {
    saveGames(games.filter(game => game.id !== id));
  };

  const toggleCompleted = (id) => {
    saveGames(games.map(game => game.id === id ? { ...game, completed: !game.completed } : game));
  };

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const sortedGames = useMemo(() => {
    const sortable = [...games];
    if (sortConfig.key === 'release_date') {
      sortable.sort((a, b) => {
        const diff = (a.first_release_date || 0) - (b.first_release_date || 0);
        return sortConfig.direction === 'ascending' ? diff : -diff;
      });
    } else if (sortConfig.key) {
      sortable.sort((a, b) => {
        const va = a[sortConfig.key];
        const vb = b[sortConfig.key];
        if (va == null && vb != null) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (va != null && vb == null) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (va == null && vb == null) return 0;
        if (sortConfig.key === 'completed') {
          if (va === vb) return 0;
          const result = va ? 1 : -1;
          return sortConfig.direction === 'ascending' ? result : -result;
        }
        if (typeof va === 'string') {
          return sortConfig.direction === 'ascending' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        const diff = va - vb;
        return sortConfig.direction === 'ascending' ? diff : -diff;
      });
    }
    return sortable;
  }, [games, sortConfig]);

  const exportGames = (filename) => {
    const blob = new Blob([JSON.stringify(games, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setSuccess(`${games.length} games exported successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const importGames = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (Array.isArray(imported)) {
            saveGames(imported);
            setSuccess('Games imported successfully!');
            setTimeout(() => setSuccess(null), 3000);
          } else {
            setError('Invalid file format');
          }
        } catch {
          setError('Error reading file');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  return {
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
    apiStatusMessage: API_STATUS_MESSAGES[apiStatus] || '',
  };
};
