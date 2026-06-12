const http = require('http');
const data = JSON.stringify({ name: 'test', salary: 5000 });
const req = http.request('http://localhost:3001/api/teachers/a1a029d0-6889-4775-a31c-3faec6b608e4', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('PATCH status:', res.statusCode, 'body:', body));
});
req.write(data);
req.end();
