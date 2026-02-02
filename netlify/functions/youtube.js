exports.handler = async (event) => {
  const { q } = event.queryStringParameters;
  const YT_API_KEY = process.env.YT_API_KEY;

  if (!YT_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "YT_API_KEY environment variable is not set." }),
    };
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&key=${YT_API_KEY}&maxResults=12`;

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
      body: JSON.stringify({ error: "Failed fetching from YouTube API" }),
    };
  }
};
