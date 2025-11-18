exports.handler = async (event) => {
  try {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${process.env.VITE_IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: 'fields name; where id = 1; limit 1;'
    });

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: response.status,
        data: data,
        authWorking: response.ok
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: error.message,
        authWorking: false
      })
    };
  }
};