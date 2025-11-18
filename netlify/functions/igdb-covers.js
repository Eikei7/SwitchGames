exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { query } = JSON.parse(event.body);
    
    const response = await fetch('https://api.igdb.com/v4/covers', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${process.env.VITE_IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};