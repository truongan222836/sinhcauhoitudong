const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Client keys:', Object.keys(client));
console.log('client.models?', client.models);
if (client.models) console.log('models keys', Object.keys(client.models));
