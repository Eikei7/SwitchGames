exports.handler = async (event) => {
  // Handle CORS preflight request
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
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { searchTerm } = JSON.parse(event.body);
    
    console.log('Received search for:', searchTerm);
    
    const query = `search "${searchTerm}"; 
    fields id,name,cover.url,platforms,first_release_date,release_dates.platform,release_dates.date;
    where platforms = (130);
    limit 10;`;
    
    console.log('Sending query:', query);
    
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${process.env.VITE_IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: query
    });

    console.log('Query response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const allGames = await response.json();
    console.log('Raw results:', allGames.length, 'games');
    
    // Filter for Nintendo Switch games (platform ID 130)
    const switchGames = allGames.filter(game => {
      const isSwitchGame = game.platforms && game.platforms.includes(130);
      console.log(`Game: ${game.name}, Platforms: ${game.platforms}, Is Switch: ${isSwitchGame}`);
      return isSwitchGame;
    });
    
    console.log('Nintendo Switch games:', switchGames.length);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(switchGames)
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