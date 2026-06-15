fetch('http://localhost:4001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@yugsoft.com', password: 'demo1234' })
})
.then(res => res.json())
.then(loginData => {
  const token = loginData.data.accessToken;
  console.log('Got token:', token.slice(0, 10) + '...');
  return fetch('http://localhost:4001/api/v1/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(({ status, data }) => console.log('Users/Me Response:', status, data))
.catch(err => console.error('ERROR:', err));
