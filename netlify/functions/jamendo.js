exports.handler = async (event) => {
  const { search, limit } = event.queryStringParameters;
  const JAM_CLIENT_ID = process.env.JAM_CLIENT_ID;

  if (!JAM_CLIENT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "JAM_CLIENT_ID environment variable is not set." }),
    };
  }

  let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAM_CLIENT_ID}&format=json`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (limit) url += `&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed fetching from Jamendo API" }),
    };
  }
};
