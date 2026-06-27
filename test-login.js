const fetch = require('node-fetch');

async function login() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email: 'admin@company.com', password: 'password' })
    });
    const data = await res.text();
    console.log(res.status, data);
  } catch(e) {
    console.error(e);
  }
}
login();
