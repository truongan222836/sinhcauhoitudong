const http = require('http');

const loginData = JSON.stringify({
  email: 'lecturer@example.com',
  password: 'password'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const { token } = JSON.parse(data);
      console.log('Login successful, token:', token.substring(0, 50) + '...');

      // Now test generate
      const genData = JSON.stringify({
        text: 'Test text for question generation',
        type: 'Trắc nghiệm',
        quantity: 1
      });

      const genOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/questions/generate',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        }
      };

      const genReq = http.request(genOptions, (genRes) => {
        let genData = '';
        genRes.on('data', (chunk) => {
          genData += chunk;
        });
        genRes.on('end', () => {
          console.log('Generate response status:', genRes.statusCode);
          console.log('Generate response:', genData);
        });
      });

      genReq.on('error', (e) => {
        console.error('Generate error:', e);
      });

      genReq.write(JSON.stringify({
        text: 'Test text for question generation',
        type: 'Trắc nghiệm',
        quantity: 1
      }));
      genReq.end();

    } catch (e) {
      console.error('Login parse error:', e);
      console.log('Raw login response:', data);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e);
});

loginReq.write(loginData);
loginReq.end();