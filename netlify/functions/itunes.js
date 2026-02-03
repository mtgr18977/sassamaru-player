exports.handler = async (event) => {
  const { term } = event.queryStringParameters;

  if (!term) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Search term is required" }),
    };
  }

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&entity=podcast&limit=15`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`iTunes API responded with status: ${response.status}`);
    }
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("iTunes API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed fetching from iTunes API" }),
    };
  }
};
