const http = require('http');
http.get('http://localhost:3001/api/payments', res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const data = JSON.parse(body);
    data.forEach((p, i) => {
      console.log(`${i+1}: student_id=${p.student_id}, amount=${p.amount}, date="${p.date}", typeof date=${typeof p.date}, startsWith 2026-06=${String(p.date).startsWith('2026-06')}`);
    });
  });
});
