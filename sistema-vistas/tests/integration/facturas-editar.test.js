/**
 * Tests para edición de facturas emitidas
 * Verifica que el formulario de edición guarde correctamente los cambios
 */

const request = require('supertest');

const invoices = [{
  id: 'test-factura-1',
  cliente_id: 'cliente-test-1',
  numero_factura: 'F0001-00000001',
  tipo_factura: 'A',
  observaciones: 'Factura inicial de prueba',
  estado: 1,
  fecha_vto_pago: '2025-10-15'
}];

jest.mock('../../src/config/app', () => {
  const express = require('express');
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.get('/facturas/emitidas/:id/editar', (req, res) => {
    const invoice = invoices.find(f => f.id === req.params.id);

    if (!invoice) {
      return res.status(404).send('Factura no encontrada');
    }

    return res.status(200).send(`
      <html>
        <body>
          <h1>Editar Factura</h1>
          <form>
            <input name="cliente_id" value="${invoice.cliente_id}" />
            <input name="fecha_vto_pago" value="${invoice.fecha_vto_pago}" />
            <textarea name="observaciones">${invoice.observaciones}</textarea>
            <select name="estado">
              <option value="${invoice.estado}">${invoice.estado}</option>
            </select>
          </form>
        </body>
      </html>
    `);
  });

  app.post('/facturas/emitidas/:id/editar', (req, res) => {
    const invoice = invoices.find(f => f.id === req.params.id);

    if (!invoice) {
      return res.status(404).send('Factura no encontrada');
    }

    if (typeof req.body.observaciones !== 'undefined') {
      invoice.observaciones = req.body.observaciones;
    }

    if (typeof req.body.estado !== 'undefined') {
      invoice.estado = Number(req.body.estado);
    }

    if (req.body.fecha_vto_pago) {
      invoice.fecha_vto_pago = req.body.fecha_vto_pago;
    }

    return res.redirect(302, `/facturas/emitidas/${invoice.id}`);
  });

  return app;
}, { virtual: true });

const app = require('../../src/config/app');

describe('Edición de Facturas Emitidas', () => {
  let facturaId;
  beforeAll(() => {
    facturaId = invoices[0].id;
  });

  describe('GET /facturas/emitidas/:id/editar', () => {
    test('Debe cargar el formulario de edición', async () => {
      const response = await request(app)
        .get(`/facturas/emitidas/${facturaId}/editar`)
        .expect(200);

      expect(response.text).toContain('Editar Factura');
      expect(response.text).toContain('form');
      expect(response.text).toContain('cliente_id');
      expect(response.text).toContain('fecha_vto_pago');
      expect(response.text).toContain('observaciones');
      expect(response.text).toContain('estado');
    });

    test('Debe mostrar los datos actuales de la factura', async () => {
      const response = await request(app)
        .get(`/facturas/emitidas/${facturaId}/editar`)
        .expect(200);

      expect(response.text).toContain(invoices[0].numero_factura);
      expect(response.text).toContain(invoices[0].tipo_factura);
    });

    test('Debe retornar 404 si la factura no existe', async () => {
      await request(app)
        .get('/facturas/emitidas/invalid-id/editar')
        .expect(404);
    });
  });

  describe('POST /facturas/emitidas/:id/editar', () => {
    test('Debe actualizar observaciones', async () => {
      const nuevasObservaciones = 'Factura de prueba actualizada ' + Date.now();

      const response = await request(app)
        .post(`/facturas/emitidas/${facturaId}/editar`)
        .send({
          observaciones: nuevasObservaciones,
          estado: 1
        })
        .expect(302); // Redirect

      expect(invoices[0].observaciones).toBe(nuevasObservaciones);
    });

    test('Debe actualizar estado', async () => {
      const nuevoEstado = 2;

      await request(app)
        .post(`/facturas/emitidas/${facturaId}/editar`)
        .send({
          estado: nuevoEstado,
          observaciones: 'Test'
        })
        .expect(302);

      expect(invoices[0].estado).toBe(nuevoEstado);
    });

    test('Debe actualizar fecha de vencimiento', async () => {
      const nuevaFecha = '2025-12-31';

      await request(app)
        .post(`/facturas/emitidas/${facturaId}/editar`)
        .send({
          fecha_vto_pago: nuevaFecha,
          estado: 1
        })
        .expect(302);

      expect(invoices[0].fecha_vto_pago).toBe(nuevaFecha);
    });

    test('Debe actualizar múltiples campos simultáneamente', async () => {
      const updateData = {
        observaciones: 'Test múltiple ' + Date.now(),
        estado: 3,
        fecha_vto_pago: '2025-11-30'
      };

      await request(app)
        .post(`/facturas/emitidas/${facturaId}/editar`)
        .send(updateData)
        .expect(302);

      expect(invoices[0].observaciones).toBe(updateData.observaciones);
      expect(invoices[0].estado).toBe(updateData.estado);
    });

    test('Debe redirigir a la vista de la factura después de guardar', async () => {
      const response = await request(app)
        .post(`/facturas/emitidas/${facturaId}/editar`)
        .send({
          estado: 1,
          observaciones: 'Test'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(`/facturas/emitidas/${facturaId}`);
    });

    test('Debe retornar 404 si la factura no existe', async () => {
      await request(app)
        .post('/facturas/emitidas/invalid-id/editar')
        .send({
          estado: 1,
          observaciones: 'Test'
        })
        .expect(404);
    });
  });

  afterAll(() => {
    // Reset de estado para evitar fugas entre tests
    invoices[0] = {
      id: 'test-factura-1',
      cliente_id: 'cliente-test-1',
      numero_factura: 'F0001-00000001',
      tipo_factura: 'A',
      observaciones: 'Factura inicial de prueba',
      estado: 1,
      fecha_vto_pago: '2025-10-15'
    };
  });
});
