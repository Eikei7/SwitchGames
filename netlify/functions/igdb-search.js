// netlify/functions/igdb-search.js

exports.handler = async (event) => {
  console.log('Environment Variables:', {
  hasClientId: !!process.env.VITE_IGDB_CLIENT_ID,
  hasAccessToken: !!process.env.VITE_IGDB_ACCESS_TOKEN,
  clientIdLength: process.env.VITE_IGDB_CLIENT_ID?.length,
  accessTokenLength: process.env.VITE_IGDB_ACCESS_TOKEN?.length
});
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
    const { query, searchTerm } = JSON.parse(event.body);
    
    console.log('Received search for:', searchTerm);
    
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${process.env.VITE_IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: query || `
        fields id, name, first_release_date, platforms, cover.*;
        search "${searchTerm}";
        where category = 0 & platforms = (130);
        limit 10;
      `
    });

    console.log('IGDB response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('IGDB returned:', data.length, 'results');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
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