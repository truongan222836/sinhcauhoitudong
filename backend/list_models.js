const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  try {
    const res = await client.listModels();
    console.log('Models:', res.models.map(m => m.name));
  } catch (e) {
    console.error('ListModels error', e);
  }
})();