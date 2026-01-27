let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Get new token
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VITE_IGDB_CLIENT_ID,
      client_secret: process.env.VITE_IGDB_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    throw new Error(`Token fetch failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Token expires in 'expires_in' seconds, cache for slightly less
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  
  return cachedToken;
}

module.exports = { getAccessToken };