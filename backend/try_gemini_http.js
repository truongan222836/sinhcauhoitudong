require('dotenv').config();
(async () => {
  const key = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const tests = [
    {body:{input: 'test'}},
    {body:{text: 'test'}},
    {body:{contents: [{type:'text',text:'test'}]}} ,
  ];
  for (const t of tests) {
    try {
      console.log('Testing payload',JSON.stringify(t.body));
      const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t.body)});
      const txt = await res.text();
      console.log('status',res.status,'response',txt);
    } catch(e){console.error('error',e);}
  }
})();