const http = require('http');
const data = JSON.stringify({student_id:'511b4b55-e0de-4bde-ba8e-7ee8130e8b92',student_name:'ندى علي',amount:100,date:'2026-06-01',received_by:'admin'});
const req = http.request({hostname:'localhost',port:3001,path:'/api/payments',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => { console.log('Status:', res.statusCode); console.log('Body:', body); });
});
req.write(data);
req.end();
