// netlify/functions/igdb-search.js
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
    
    // Try multiple query approaches that are known to work
    const queries = [
      // Simple search without filters
      `search "${searchTerm}"; fields id,name,cover.url; limit 10;`,
      
      // Search with platform filter (Nintendo Switch = 130)
      `search "${searchTerm}"; fields id,name,cover.url; where platforms = (130); limit 10;`,
      
      // Broader platform search
      `search "${searchTerm}"; fields id,name,cover.url; where platforms = [130]; limit 10;`,
      
      // Even simpler - just get popular games to test
      `fields id,name,cover.url; where rating > 80; sort rating desc; limit 10;`
    ];

    let results = [];
    let successfulQuery = '';
    
    // Try each query until we get results
    for (const query of queries) {
      console.log('Trying query:', query);
      
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
      
      if (response.ok) {
        const data = await response.json();
        console.log('Query returned:', data.length, 'results');
        
        if (data.length > 0) {
          results = data;
          successfulQuery = query;
          break; // We got results, stop trying other queries
        }
      }
    }
    
    console.log('Final results:', results.length, 'using query:', successfulQuery);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(results)
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