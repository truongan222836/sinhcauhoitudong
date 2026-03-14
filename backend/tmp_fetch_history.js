const fetch = require('node-fetch');
(async()=>{
  try{
    const login = await fetch('http://localhost:3000/api/users/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'student@example.com',password:'password'})});
    const {token}=await login.json();
    const hist = await fetch('http://localhost:3000/api/users/history',{headers:{Authorization:'Bearer '+token}});
    const data = await hist.json();
    console.log('history result', JSON.stringify(data,null,2));
  }catch(e){console.error(e);}
})();