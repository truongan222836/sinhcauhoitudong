require('dotenv').config();
(async () => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log('models HTTP:', JSON.stringify(data, null, 2));
  } catch(e){ console.error('error', e);
  }
})();