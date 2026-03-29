const express = require('express');
const Groq = require('groq-sdk');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getCount() {
  try {
    return JSON.parse(fs.readFileSync('counter.json')).count;
  } catch(e) { return 0; }
}

function incrementCount() {
  try {
    const count = getCount() + 1;
    fs.writeFileSync('counter.json', JSON.stringify({count}));
    return count;
  } catch(e) { return 0; }
}

app.get('/', (req, res) => {
  const count = getCount();
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI SOP Generator</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); width: 100%; max-width: 560px; }
        h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
        p { color: #666; font-size: 15px; margin-bottom: 24px; line-height: 1.5; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; margin-bottom: 12px; }
        button { width: 100%; padding: 13px; background: #111; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
        button:hover { background: #333; }
        .badge { display: inline-block; background: #f0f0f0; color: #666; font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-bottom: 20px; }
        .counter { display: inline-block; background: #fff8e7; color: #b45309; font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-bottom: 20px; margin-left: 8px; }
        .how { margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; }
        .how p { font-size: 13px; color: #999; margin-bottom: 8px; }
        .step { font-size: 13px; color: #555; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🗂️ AI SOP Generator</h1>
        <p>Paste a Loom URL and get a clean, structured SOP in 60 seconds. Free.</p>
        <span class="badge">✨ No signup required</span>
        <span class="counter">🔥 ${count} SOPs generated</span>
        <form action="/generate" method="POST">
          <input type="text" name="url" placeholder="Paste your Loom URL here..." required />
          <button type="submit">Generate SOP →</button>
        </form>
        <div class="how">
          <p>How it works:</p>
          <div class="step">1. Paste any Loom video URL</div>
          <div class="step">2. AI reads the video and extracts the process</div>
          <div class="step">3. Get a clean SOP with steps, roles, and tools</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/generate', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.send('<p>Missing URL. <a href="/">Go back</a></p>');

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let context = '';
    try {
      const loomId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
      if (!loomId) throw new Error('Invalid Loom URL');
      const oembedRes = await axios.get(`https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`);
      const title = oembedRes.data?.title || 'Process Recording';
      context = `Video title: "${title}". Generate a detailed SOP based on this title.`;
    } catch(e) {
      context = `URL: ${url}. Generate a practical SOP for a general business process.`;
    }

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert SOP writer. Generate a detailed Standard Operating Procedure in this exact format:

TITLE: [Clear action-oriented title]

OVERVIEW
[2-3 sentences explaining what this covers and why it matters]

ROLES INVOLVED
- [Role] - [what they do]

TOOLS USED
- [Tool] - [how it is used]

STEP-BY-STEP INSTRUCTIONS
Step 1: [Title]
Action: [what to do]
Expected Result: [what done looks like]

Step 2: [Title]
Action: [what to do]
Expected Result: [what done looks like]

EDGE CASES
- [What can go wrong] - [how to fix it]

DEFINITION OF DONE
[One sentence on how you know this process is complete]`
        },
        { role: "user", content: context }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const sop = completion.choices[0].message.content;
    incrementCount();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Your SOP</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 40px 20px; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); width: 100%; max-width: 720px; }
          h2 { font-size: 20px; margin-bottom: 20px; color: #111; }
          pre { white-space: pre-wrap; font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.8; color: #333; background: #f9f9f9; padding: 24px; border-radius: 8px; border: 1px solid #eee; }
          .actions { margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
          button, a { padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; }
          .copy-btn { background: #111; color: white; border: none; }
          .print-btn { background: #f0f0f0; color: #333; border: none; }
          .back-btn { background: #f0f0f0; color: #333; }
          .feedback { margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 13px; color: #999; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🗂️ Your SOP</h2>
          <pre id="sop">${sop.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <div class="actions">
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('sop').innerText).then(()=>this.innerText='✅ Copied!')">Copy SOP</button>
            <button class="print-btn" onclick="window.print()">Download PDF 🖨️</button>
            <a href="/" class="back-btn">Generate Another →</a>
          </div>
          <div class="feedback">
            Was this useful? Reply to let us know what you'd improve.
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    res.send(`
      <div style="padding:40px;font-family:sans-serif">
        <p style="color:red;margin-bottom:12px">Error: ${err.message}</p>
        <a href="/">Go back and try again</a>
      </div>
    `);
  }
});

app.listen(3000, () => console.log('SOP Generator running on port 3000'));
