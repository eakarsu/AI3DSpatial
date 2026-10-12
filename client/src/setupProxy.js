const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`;
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true, onProxyReq(proxyReq,req,res){const interrupt=()=>{if(!res.writableEnded)proxyReq.destroy();};req.once('aborted',interrupt);res.once('close',interrupt);proxyReq.once('close',()=>{req.removeListener('aborted',interrupt);res.removeListener('close',interrupt);});} }));
};
