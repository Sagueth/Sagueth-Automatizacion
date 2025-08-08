// // keep-alive.js
// console.log("Servidor mantenido activo...");
// setInterval(() => {
//   console.log("Servidor sigue activo...");
// }, 60000); // Log cada 60 segundos

// keep-alive.js
import http from 'http';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Playwright service is alive\n');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Mantener el proceso activo
setInterval(() => {
  console.log('Service heartbeat');
}, 60000);