const { GoogleGenerativeAI } = require('@google/generative-ai');
// inspect formatting helpers
const { formatGenerateContentInput } = require('@google/generative-ai/dist/index.js');

const example = formatGenerateContentInput('Test prompt');
console.log('formatted:', JSON.stringify(example, null, 2));
