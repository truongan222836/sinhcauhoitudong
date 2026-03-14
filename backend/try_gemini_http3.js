require('dotenv').config();
(async()=>{
  const key=process.env.GEMINI_API_KEY;
  const model='gemini-2.5-flash';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body={generateContentRequest:{contents:[{text:'hello world'}],temperature:0.7}};
  console.log('sending',JSON.stringify(body));
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const txt=await res.text();
  console.log(res.status,txt);
})();