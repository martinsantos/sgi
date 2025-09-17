const ClienteModel = require('../models/ClienteModel');

/**
 * Controlador de Clientes - Funcionalidades CRM
 */
class ClienteController {

  /**
   * Listar todos los clientes con paginación
   */
  static async listar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      console.log(`📋 Listando clientes - Página ${page}, Límite ${limit}`);

      const resultado = await ClienteModel.getClientes(page, limit);

      res.render('clientes/listar', {
        title: 'Gestión de Clientes',
        clientes: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al listar clientes:', error);
      req.flash('error', 'Error al cargar la lista de clientes');
      res.redirect('/dashboard');
    }
  }

  /**
   * Mostrar formulario de creación de cliente
   */
  static async mostrarCrear(req, res) {
    try {
      console.log('📝 Mostrando formulario de creación de cliente');

      res.render('clientes/crear', {
        title: 'Crear Nuevo Cliente',
        tiposPersona: ['Física', 'Jurídica'],
        condicionesIva: [
          'Responsable Inscripto',
          'Monotributista',
          'Exento',
          'Consumidor Final'
        ]
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario de creación');
      res.redirect('/clientes');
    }
  }

  /**
   * Crear nuevo cliente
   */
  static async crear(req, res) {
    try {
      console.log('💾 Creando nuevo cliente:', req.body);

      const clienteData = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        codigo: req.body.codigo,
        tipo_persona: req.body.tipo_persona || 'Jurídica',
        condicion_iva: req.body.condicion_iva,
        email: req.body.email,
        telefono: req.body.telefono,
        telefono_auxiliar: req.body.telefono_auxiliar,
        web: req.body.web,
        cuil_cuit: req.body.cuil_cuit,
        calle: req.body.calle,
        numero: req.body.numero,
        codigo_postal: req.body.codigo_postal
      };

      // Validaciones básicas
      if (!clienteData.nombre && !clienteData.apellido) {
        req.flash('error', 'Debe ingresar al menos un nombre o apellido');
        return res.redirect('/clientes/crear');
      }

      const clienteId = await ClienteModel.createCliente(clienteData);

      req.flash('success', 'Cliente creado exitosamente');
      res.redirect(`/clientes/${clienteId}`);

    } catch (error) {
      console.error('❌ Error al crear cliente:', error);
      req.flash('error', 'Error al crear el cliente: ' + error.message);
      res.redirect('/clientes/crear');
    }
  }

  /**
   * Ver detalles de un cliente (CRM)
   */
  static async ver(req, res) {
    try {
      const id = req.params.id;
      console.log(`👁️ Visualizando cliente ID: ${id}`);

      const cliente = await ClienteModel.getClienteById(id);

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }

      // Debug: Verificar datos antes de renderizar
      console.log('📊 Debug - Datos para vista:');
      console.log('- Cliente:', cliente.nombre_completo);
      console.log('- Facturas:', (cliente.facturas || []).length);
      console.log('- Proyectos:', (cliente.proyectos || []).length);
      console.log('- Presupuestos:', (cliente.presupuestos || []).length);
      console.log('- Certificados:', (cliente.certificados || []).length);
      
      res.render('clientes/ver', {
        title: `Cliente: ${cliente.nombre_completo}`,
        cliente,
        // Extraer relaciones para acceso directo en la vista
        proyectos: cliente.proyectos || [],
        facturas: cliente.facturas || [],
        presupuestos: cliente.presupuestos || [],
        certificados: cliente.certificados || [],
        resumen: cliente.resumen_financiero || {},
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al visualizar cliente:', error);
      req.flash('error', 'Error al cargar el cliente');
      res.redirect('/clientes');
    }
  }

  /**
   * Mostrar formulario de edición
   */
  static async mostrarEditar(req, res) {
    try {
      const id = req.params.id;
      console.log(`✏️ Mostrando formulario de edición para cliente ID: ${id}`);

      const cliente = await ClienteModel.getClienteById(id);

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }

      res.render('clientes/editar', {
        title: `Editar Cliente: ${cliente.nombre_completo}`,
        cliente,
        tiposPersona: ['Física', 'Jurídica'],
        condicionesIva: [
          'Responsable Inscripto',
          'Monotributista',
          'Exento',
          'Consumidor Final'
        ]
      });

    } catch (error) {
      console.error('❌ Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario de edición');
      res.redirect('/clientes');
    }
  }

  /**
   * Actualizar cliente
   */
  static async actualizar(req, res) {
    try {
      const id = req.params.id;
      console.log(`💾 Actualizando cliente ID: ${id}`, req.body);

      // Para simplicidad, por ahora solo mostraremos mensaje
      // En un escenario real implementaríamos ClienteModel.updateCliente
      req.flash('info', 'Función de actualización pendiente de implementación');
      res.redirect(`/clientes/${id}`);

    } catch (error) {
      console.error('❌ Error al actualizar cliente:', error);
      req.flash('error', 'Error al actualizar el cliente: ' + error.message);
      res.redirect(`/clientes/${req.params.id}/editar`);
    }
  }

  /**
   * Buscar clientes con filtros
   */
  static async buscar(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const filters = {
        nombre: req.query.nombre,
        email: req.query.email,
        telefono: req.query.telefono,
        activo: req.query.activo !== undefined ? parseInt(req.query.activo) : null
      };

      // Remover filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      console.log('🔍 Buscando clientes con filtros:', filters);

      const resultado = await ClienteModel.searchClientes(filters, page, limit);

      res.render('clientes/listar', {
        title: 'Búsqueda de Clientes',
        clientes: resultado.data,
        pagination: resultado.pagination,
        currentPage: page,
        query: req.query,
        filters: filters,
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al buscar clientes:', error);
      req.flash('error', 'Error en la búsqueda de clientes');
      res.redirect('/clientes');
    }
  }

  /**
   * API: Obtener clientes en formato JSON
   */
  static async searchJSON(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        nombre: req.query.nombre,
        email: req.query.email,
        telefono: req.query.telefono
      };

      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const resultado = await ClienteModel.searchClientes(filters, page, limit);

      res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination
      });

    } catch (error) {
      console.error('❌ Error en API de búsqueda de clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Dashboard de clientes con estadísticas CRM
   */
  static async dashboard(req, res) {
    try {
      console.log('📊 Cargando dashboard de clientes');

      const [estadisticas, clientesRecientes] = await Promise.all([
        ClienteModel.getEstadisticas(),
        ClienteModel.getClientes(1, 10)
      ]);

      res.render('clientes/dashboard', {
        title: 'Dashboard de Clientes',
        estadisticas,
        clientesRecientes: clientesRecientes.data,
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard de clientes:', error);
      req.flash('error', 'Error al cargar el dashboard de clientes');
      res.redirect('/dashboard');
    }
  }

  /**
   * Historial comercial del cliente (GC.2)
   */
  static async historialComercial(req, res) {
    try {
      const clienteId = req.params.id;
      console.log(`📋 Obteniendo historial comercial del cliente ${clienteId}`);

      const cliente = await ClienteModel.getClienteById(clienteId);

      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }

      res.render('clientes/historial', {
        title: `Historial Comercial - ${cliente.nombre_completo}`,
        cliente,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener historial comercial:', error);
      req.flash('error', 'Error al cargar el historial comercial');
      res.redirect(`/clientes/${req.params.id}`);
    }
  }

  /**
   * Cartera de clientes por vendedor (GC.1, GC.3)
   */
  static async carteraPorVendedor(req, res) {
    try {
      const vendedorId = req.query.vendedor_id || req.user?.id;
      console.log(`👨‍💼 Cargando cartera del vendedor ${vendedorId}`);

      // Por ahora mostramos todos los clientes
      // En una implementación completa se filtrarían por vendedor
      const resultado = await ClienteModel.getClientes(1, 50);

      res.render('clientes/cartera', {
        title: 'Mi Cartera de Clientes',
        clientes: resultado.data,
        vendedorId,
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al cargar cartera de clientes:', error);
      req.flash('error', 'Error al cargar la cartera de clientes');
      res.redirect('/clientes');
    }
  }

  /**
   * Generar lead desde cliente (GC.4)
   */
  static async generarLead(req, res) {
    try {
      const clienteId = req.params.id;
      const { descripcion, valor_estimado, probabilidad, observaciones } = req.body;

      console.log(`🎯 Generando lead para cliente ${clienteId}`);

      // Crear lead usando LeadModel
      const LeadModel = require('../models/LeadModel');
      
      const leadData = {
        titulo: descripcion || 'Lead generado desde cliente',
        cliente_id: clienteId,
        valor_estimado: parseFloat(valor_estimado) || 0,
        probabilidad: parseInt(probabilidad) || 50,
        fuente: 'cliente',
        notas: observaciones || 'Lead generado desde gestión de cliente'
      };

      const leadId = await LeadModel.createLead(leadData);

      req.flash('success', 'Lead creado exitosamente desde cliente');
      res.redirect(`/leads/${leadId}`);

    } catch (error) {
      console.error('❌ Error al generar lead:', error);
      req.flash('error', 'Error al generar lead: ' + error.message);
      res.redirect(`/clientes/${req.params.id}`);
    }
  }

  /**
   * Reporte de comisiones por vendedor (GC.5)
   */
  static async reporteComisiones(req, res) {
    try {
      const vendedorId = req.query.vendedor_id || req.user?.id;
      const fechaDesde = req.query.fecha_desde;
      const fechaHasta = req.query.fecha_hasta;

      console.log(`💰 Generando reporte de comisiones para vendedor ${vendedorId}`);

      // Implementación simplificada - en la práctica se calcularían las comisiones reales
      const comisiones = {
        total_ventas: 0,
        comision_total: 0,
        comision_liquidada: 0,
        comision_pendiente: 0,
        detalle_ventas: []
      };

      res.render('clientes/comisiones', {
        title: 'Reporte de Comisiones',
        comisiones,
        vendedorId,
        fechaDesde,
        fechaHasta,
        formatCurrency: (amount) => {
          if (!amount || isNaN(amount)) return '$0.00';
          return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
          }).format(amount);
        },
        formatDate: (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString('es-AR');
          } catch (error) {
            return 'N/A';
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al generar reporte de comisiones:', error);
      req.flash('error', 'Error al generar reporte de comisiones');
      res.redirect('/clientes');
    }
  }
}

module.exports = ClienteController;
