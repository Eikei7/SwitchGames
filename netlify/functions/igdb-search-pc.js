const { getAccessToken } = require('./getToken');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { searchTerm } = JSON.parse(event.body);
    const token = await getAccessToken(); // Auto-refresh token
    
    const query = `search "${searchTerm}"; 
    fields id,name,cover.url,platforms,first_release_date,release_dates.platform,release_dates.date;
    where platforms = (6);
    limit 10;`;
    
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: query
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IGDB API error: ${response.status} - ${errorText}`);
    }

    const allGames = await response.json();
    
    const pcGames = allGames.filter(game => {
      return game.platforms && game.platforms.includes(6);
    });
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pcGames)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};