// proxy.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.post('/api/igdb/games', async (req, res) => {
  try {
    const { query, clientId, accessToken } = req.body;
    
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/igdb/artwork', async (req, res) => {
  try {
    const { query, clientId, accessToken } = req.body;
    
    const response = await fetch('https://api.igdb.com/v4/artworks', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/igdb/covers', async (req, res) => {
  try {
    const { query, clientId, accessToken } = req.body;
    
    const response = await fetch('https://api.igdb.com/v4/covers', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`CORS proxy server running on http://localhost:${PORT}`);
});