exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const fail = (code, msg) => ({
    statusCode: code,
    headers,
    body: JSON.stringify({ error: msg }),
  });

  if (event.httpMethod !== "POST")
    return fail(405, "Please use POST to send a message.");

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return fail(500, "GROQ_API_KEY is missing.");

    const body = JSON.parse(event.body || "{}");
    const history = Array.isArray(body.messages)
      ? body.messages.filter(
          (m) => m && m.role !== "system" && typeof m.content === "string"
        )
      : [];
    let message =
      body.message || body.text || body.prompt || body.input || body.content;
    if (!message && history.length) {
      const last = [...history].reverse().find((m) => m.role === "user");
      message = last && last.content;
    }
    if (!message || typeof message !== "string")
      return fail(400, "Please enter a message.");

    const system = {
      role: "system",
      content:
        typeof body.system === "string" && body.system
          ? body.system
          : "You are Nova, a helpful AI assistant.",
    };
    const msgs = history.length
      ? [system, ...history]
      : [system, { role: "user", content: message }];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: msgs,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok)
      return fail(
        response.status,
        (data.error && data.error.message) || "Groq error"
      );

    const reply =
      (data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      "";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        text: reply,
        response: reply,
        content: reply,
      }),
    };
  } catch (e) {
    return fail(500, e.message);
  }
};
