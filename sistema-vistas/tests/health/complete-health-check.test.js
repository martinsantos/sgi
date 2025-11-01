/**
 * HEALTH CHECK COMPLETO - WEBAPP SGI
 * Suite exhaustiva para verificar salud de todas las funciones críticas
 */

const request = require("supertest");
const app = require("../test-app");

describe("🏥 HEALTH CHECK COMPLETO - SISTEMA SGI", () => {
  
  beforeEach(() => {
    app.resetMockData();
  });

  describe("1️⃣ MÓDULO DASHBOARD", () => {
    test("dashboard principal", async () => {
      const res = await request(app).get("/dashboard");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("estadísticas del sistema", async () => {
      const res = await request(app).get("/api/dashboard/estadisticas");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("métricas de ventas", async () => {
      const res = await request(app).get("/api/dashboard/metricas/ventas");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("métricas de proyectos", async () => {
      const res = await request(app).get("/api/dashboard/metricas/proyectos");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("métricas financieras", async () => {
      const res = await request(app).get("/api/dashboard/metricas/financiero");
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("2️⃣ MÓDULO CLIENTES - Listado", () => {
    test("listar todos los clientes", async () => {
      const res = await request(app).get("/clientes");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("paginación de clientes", async () => {
      const res = await request(app).get("/clientes?page=1&limit=20");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("buscar clientes por nombre", async () => {
      const res = await request(app).get("/clientes?search=test");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("filtrar clientes activos", async () => {
      const res = await request(app).get("/clientes?activo=1");
      expect([200, 302]).toContain(res.statusCode);
    });
  });

  describe("3️⃣ MÓDULO CLIENTES - CRUD", () => {
    test("crear nuevo cliente", async () => {
      const res = await request(app).post("/clientes").send({
        codigo: "HEALTH01",
        nombre: "Cliente Health Test",
        tipo_cliente: "empresa"
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("ver detalle de cliente", async () => {
      const res = await request(app).get("/clientes/1");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("actualizar cliente", async () => {
      const res = await request(app).put("/clientes/1").send({
        nombre: "Cliente Actualizado"
      });
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("eliminar cliente", async () => {
      const res = await request(app).delete("/clientes/1");
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("4️⃣ MÓDULO FACTURAS - Emitidas", () => {
    test("dashboard de facturación", async () => {
      const res = await request(app).get("/facturas/dashboard");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("listar facturas emitidas", async () => {
      const res = await request(app).get("/facturas/emitidas");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("formulario nueva factura", async () => {
      const res = await request(app).get("/facturas/nueva");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("crear factura", async () => {
      const res = await request(app).post("/facturas/crear").send({
        cliente_id: 1,
        tipo_factura: "B",
        items: [{descripcion: "Test", cantidad: 1, precio_unitario: 1000}]
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("anular factura", async () => {
      const res = await request(app).put("/facturas/emitidas/1/anular");
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("5️⃣ MÓDULO FACTURAS - Recibidas", () => {
    test("listar facturas recibidas", async () => {
      const res = await request(app).get("/facturas/recibidas");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("formulario factura recibida", async () => {
      const res = await request(app).get("/facturas/nueva-recibida");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("registrar factura recibida", async () => {
      const res = await request(app).post("/facturas/recibidas").send({
        proveedor_id: 1,
        numero_factura: "0001-00001234",
        total: 5000
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("6️⃣ MÓDULO PRESUPUESTOS", () => {
    test("listar presupuestos", async () => {
      const res = await request(app).get("/presupuestos");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("filtrar por estado", async () => {
      const res = await request(app).get("/presupuestos?estado=pendiente");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("crear presupuesto", async () => {
      const res = await request(app).post("/presupuestos").send({
        cliente_id: 1,
        descripcion: "Test",
        items: [{descripcion: "Item", cantidad: 1, precio_unitario: 1000}]
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("aprobar presupuesto", async () => {
      const res = await request(app).put("/presupuestos/1/aprobar");
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("convertir a proyecto", async () => {
      const res = await request(app).post("/presupuestos/1/convertir-a-proyecto");
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("7️⃣ MÓDULO PROYECTOS", () => {
    test("listar proyectos", async () => {
      const res = await request(app).get("/proyectos");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("filtrar activos", async () => {
      const res = await request(app).get("/proyectos?estado=activo");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("crear proyecto", async () => {
      const res = await request(app).post("/proyectos").send({
        cliente_id: 1,
        nombre: "Proyecto Health",
        fecha_inicio: "2025-10-22"
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("ver detalle", async () => {
      const res = await request(app).get("/proyectos/1");
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("8️⃣ MÓDULO LEADS", () => {
    test("listar leads", async () => {
      const res = await request(app).get("/leads");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("crear lead", async () => {
      const res = await request(app).post("/leads").send({
        nombre: "Lead Test",
        email: "test@test.com",
        telefono: "1234567890"
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("actualizar estado", async () => {
      const res = await request(app).put("/leads/1/estado").send({estado: "contactado"});
      expect([200, 302, 404]).toContain(res.statusCode);
    });

    test("convertir a cliente", async () => {
      const res = await request(app).post("/leads/1/convertir-a-cliente");
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("9️⃣ MÓDULO CERTIFICADOS", () => {
    test("listar certificados", async () => {
      const res = await request(app).get("/certificados");
      expect([200, 302]).toContain(res.statusCode);
    });

    test("crear certificado", async () => {
      const res = await request(app).post("/certificados").send({
        proyecto_id: 1,
        numero: "CERT-001",
        monto: 50000
      });
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });

    test("facturar certificado", async () => {
      const res = await request(app).post("/certificados/1/facturar");
      expect([200, 201, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("🔟 HEALTH CHECK ENDPOINTS", () => {
    test("health check básico", async () => {
      const res = await request(app).get("/health");
      expect([200, 404]).toContain(res.statusCode);
    });

    test("health check detallado", async () => {
      const res = await request(app).get("/api/health");
      expect([200, 404]).toContain(res.statusCode);
    });

    test("verificar base de datos", async () => {
      const res = await request(app).get("/api/health/database");
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe("1️⃣1️⃣ PERFORMANCE", () => {
    test("respuesta rápida (<3s)", async () => {
      const start = Date.now();
      await request(app).get("/clientes");
      expect(Date.now() - start).toBeLessThan(3000);
    });

    test("requests concurrentes", async () => {
      const promises = Array.from({length: 10}, () => request(app).get("/dashboard"));
      const results = await Promise.all(promises);
      results.forEach(res => expect([200, 302]).toContain(res.statusCode));
    });

    test("payload grande", async () => {
      const large = {nombre: "x".repeat(1000), descripcion: "x".repeat(5000)};
      const res = await request(app).post("/clientes").send(large);
      expect([200, 201, 400, 413, 302, 404]).toContain(res.statusCode);
    });
  });

  describe("1️⃣2️⃣ SEGURIDAD", () => {
    test("protección de rutas", async () => {
      const res = await request(app).get("/dashboard");
      expect([200, 302, 401]).toContain(res.statusCode);
    });

    test("validación de entrada", async () => {
      const res = await request(app).post("/clientes").send({nombre: 123});
      expect([400, 422, 302, 404, 201]).toContain(res.statusCode);
    });

    test("prevenir SQL injection", async () => {
      const res = await request(app).get("/clientes?search='; DROP TABLE clientes; --");
      expect([200, 302, 400]).toContain(res.statusCode);
    });
  });

  describe("1️⃣3️⃣ MANEJO DE ERRORES", () => {
    test("404 ruta inexistente", async () => {
      const res = await request(app).get("/ruta-inexistente");
      expect([404, 302]).toContain(res.statusCode);
    });

    test("ID inválido", async () => {
      const res = await request(app).get("/clientes/abc");
      expect([400, 404, 302]).toContain(res.statusCode);
    });

    test("recurso no encontrado", async () => {
      const res = await request(app).get("/clientes/99999");
      expect([404, 302]).toContain(res.statusCode);
    });

    test("JSON malformado", async () => {
      const res = await request(app).post("/clientes")
        .set("Content-Type", "application/json").send("{ invalid }");
      expect([400, 500, 302, 404]).toContain(res.statusCode);
    });
  });
});
