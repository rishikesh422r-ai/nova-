exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Please use POST to send a message."
      })
    };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "GROQ_API_KEY is missing in Netlify environment variables."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");
let message = body.message || body.text || body.prompt || body.input || body.content;
if (!message && Array.isArray(body.messages)) {
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  message = lastUser && lastUser.content;
}

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Please enter a message."
        })
      };
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: "You are Nova Enchanting Fairy, a helpful AI assistant."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "Groq API request failed."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: data.choices?.[0]?.message?.content || "No reply received."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server error. Check your Netlify function logs."
      })
    };
  }
};
