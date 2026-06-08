import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.OPENAI_API_KEY; // The codebase uses this for gemini too
  const chatModel = process.env.OPENAI_CHAT_MODEL || 'gemini-2.5-flash';
  
  const modelName = chatModel.startsWith('models/') ? chatModel : `models/${chatModel}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;
  
  const finalPrompt = 'Hello, return {"status": "ok"} as JSON.';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey!,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Fetch Error:", err.message);
  }
}

test();
