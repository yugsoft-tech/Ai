const jwt = require('jsonwebtoken');
const http = require('http');

const secret = '/hPWIuoifq3Dr/pssgfgMEbXbqjFu71Jjl75/cUC+QmzHRUayqArbG2YxblGbcgeOCDFWj5dCKSj+5JKPl+6DA==';
const token = jwt.sign({ sub: '123e4567-e89b-12d3-a456-426614174000', email: 'test@test.com', role: 'student', tenantId: '123e4567-e89b-12d3-a456-426614174000' }, secret, { expiresIn: '1h' });

const data = JSON.stringify({
  query: 'hii'
});

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/v1/rag/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => {
    body += d;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
