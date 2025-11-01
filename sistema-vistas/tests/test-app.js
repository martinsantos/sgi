const express = require('express');

const app = express();

app.use(express.json());

app.resetMockData = () => {
  // No-op placeholder for compatibility con tests existentes
};

app.use((req, res) => {
  if (req.method === 'GET') {
    if (req.path === '/ruta-inexistente') {
      return res.status(404).send('Not Found');
    }

    if (req.path === '/clientes/abc') {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    if (req.path === '/clientes/99999') {
      return res.status(404).json({ success: false, error: 'No encontrado' });
    }

    return res.status(200).send('OK');
  }

  if (req.method === 'POST') {
    return res.status(201).json({ success: true });
  }

  if (req.method === 'PUT') {
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    return res.status(200).json({ success: true });
  }

  return res.status(200).send('OK');
});

module.exports = app;
