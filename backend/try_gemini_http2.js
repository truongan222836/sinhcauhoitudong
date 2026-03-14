require('dotenv').config();
(async()=>{
  const key=process.env.GEMINI_API_KEY;
  const model='gemini-2.5-flash';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const tests=[
    {instances:['test']},
    {instances:[{input:'test'}]},
    {instances:[{text:'test'}]},
    {instances:[{content:'test'}]},
    {prompt:'test'},
    {input:'test'},
  ];
  for(const t of tests){
    console.log('\n==== testing',JSON.stringify(t));
    try{
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
      const txt=await res.text();
      console.log('status',res.status,txt);
    }catch(e){console.error('fetch error',e);}
  }
})();