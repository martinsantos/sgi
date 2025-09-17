const FacturaModel = require('../models/FacturaModel');
const PresupuestoModel = require('../models/PresupuestoModel');
const ClienteModel = require('../models/ClienteModel'); 
const ProyectoModel = require('../models/ProyectoModel');
const CertificadoModel = require('../models/CertificadoModel');
const LeadModel = require('../models/LeadModel');
const { cache } = require('../utils/cache');

/**
 * Controlador del Dashboard - Estadísticas centralizadas
 */
class DashboardController {

  /**
   * Renderizar dashboard principal con todas las estadísticas
   */
  static async index(req, res) {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Loading log removed for production
      }

      // Intentar obtener estadísticas del cache primero
      const CACHE_TTL = 3 * 60 * 1000; // 3 minutos
      
      const [
        estadisticasPresupuestos,
        estadisticasFacturas,
        estadisticasProyectos,
        estadisticasClientes,
        estadisticasCertificados,
        estadisticasLeads,
        presupuestosRecientes,
        proyectosActivos,
        facturasRecientes
      ] = await Promise.allSettled([
        cache.cachedCall('presupuestos_stats', () => PresupuestoModel.getEstadisticas(), CACHE_TTL),
        cache.cachedCall('facturas_stats', () => FacturaModel.getEstadisticas(), CACHE_TTL),
        cache.cachedCall('proyectos_stats', () => ProyectoModel.getEstadisticas(), CACHE_TTL),
        cache.cachedCall('clientes_stats', () => ClienteModel.getEstadisticas(), CACHE_TTL),
        Promise.resolve({total_certificados: 0, valor_total_certificados: 0}),
        cache.cachedCall('leads_stats', () => LeadModel.getEstadisticas(), CACHE_TTL),
        cache.cachedCall('presupuestos_recent', () => PresupuestoModel.getPresupuestosRecientes(5), CACHE_TTL),
        cache.cachedCall('proyectos_active', () => ProyectoModel.getProyectosActivos(5), CACHE_TTL),
        cache.cachedCall('facturas_recent', () => FacturaModel.getFacturasRecientes(5), CACHE_TTL)
      ]);

      // Función auxiliar para extraer valores o defaults seguros
      const getValue = (result, defaultValue = {}) => {
        return result.status === 'fulfilled' ? result.value : defaultValue;
      };

      const getArrayValue = (result, defaultValue = []) => {
        return result.status === 'fulfilled' ? result.value : defaultValue;
      };

      // Estadísticas consolidadas con valores reales
      const stats = {
        presupuestos: getValue(estadisticasPresupuestos, {
          total_presupuestos: 0,
          importe_total_todos: 0,
          total_aprobados: 0,
          tasa_aprobacion: 0
        }),
        clientes: getValue(estadisticasClientes, {
          total_clientes: 0,
          clientes_activos: 0,
          nuevos_este_mes: 0
        }),
        facturas: getValue(estadisticasFacturas, {
          total_facturas: 0,
          valor_total_facturas: 0,
          facturas_pendientes: 0,
          valor_pendiente: 0
        }),
        proyectos: getValue(estadisticasProyectos, {
          total_proyectos: 0,
          proyectos_activos: 0,
          proyectos_finalizados: 0,
          valor_total_proyectos: 0
        }),
        certificados: getValue(estadisticasCertificados, {
          total_certificados: 0,
          valor_total_certificados: 0,
          certificados_facturados: 0,
          valor_facturado: 0
        }),
        leads: getValue(estadisticasLeads, {
          total_leads: 0,
          leads_nuevos: 0,
          valor_total_pipeline: 0,
          tasa_conversion: 0
        })
      };

      // Actividad reciente (simplificada)
      const actividadReciente = {
        presupuestos: getArrayValue(presupuestosRecientes),
        proyectos: getArrayValue(proyectosActivos),
        certificados: [],
        facturas: getArrayValue(facturasRecientes),
        leads: []
      };

      // Crear resumen general
      const resumenGeneral = {
        ingresos_potenciales: (stats.presupuestos.importe_total_todos || 0) + (stats.leads.valor_total_pipeline || 0),
        ingresos_confirmados: stats.facturas.valor_total_facturas || 0,
        proyectos_en_curso: stats.proyectos.proyectos_activos || 0,
        certificaciones_pendientes: (stats.certificados.total_certificados || 0) - (stats.certificados.certificados_facturados || 0)
      };

      // Calcular métricas de rendimiento
      const metricas = {
        eficiencia_ventas: stats.presupuestos.tasa_aprobacion,
        conversion_leads: stats.leads.tasa_conversion,
        valor_promedio_proyecto: stats.proyectos.total_proyectos > 0 
          ? stats.proyectos.valor_total_proyectos / stats.proyectos.total_proyectos 
          : 0,
        certificaciones_promedio: stats.certificados.total_certificados > 0
          ? stats.certificados.valor_total_certificados / stats.certificados.total_certificados
          : 0
      };

      // DEBUG log removed for production
      
      // DEBUG log removed for production
      
      // Log removed for production

      res.render('dashboard/index', {
        title: 'Dashboard - Sistema de Gestión Integral',
        stats,
        resumenGeneral,
        metricas,
        actividadReciente,
        layout: 'main'
      });

    } catch (error) {
      console.error('❌ Error al cargar dashboard:', error);
      
      // En caso de error, mostrar dashboard con datos vacíos
      res.render('dashboard/index', {
        title: 'Dashboard - Sistema de Gestión Integral',
        stats: {
          presupuestos: { total_presupuestos: 0, valor_total: 0 },
          clientes: { total_clientes: 0, clientes_activos: 0 },
          facturas: { total_facturas: 0, valor_total_facturas: 0 },
          proyectos: { total_proyectos: 0, proyectos_activos: 0 },
          certificados: { total_certificados: 0, valor_total_certificados: 0 },
          leads: { total_leads: 0, valor_total_pipeline: 0 }
        },
        resumenGeneral: {
          ingresos_potenciales: 0,
          ingresos_confirmados: 0,
          proyectos_en_curso: 0,
          certificaciones_pendientes: 0
        },
        metricas: {
          eficiencia_ventas: 0,
          conversion_leads: 0,
          valor_promedio_proyecto: 0,
          certificaciones_promedio: 0
        },
        actividadReciente: {
          presupuestos: [],
          proyectos: [],
          certificados: [],
          facturas: [],
          leads: []
        },
        formatCurrency: () => '$0.00',
        formatNumber: () => '0',
        formatPercentage: () => '0%',
        formatDate: () => 'N/A',
        error: 'Error al cargar las estadísticas del sistema'
      });
    }
  }

  /**
   * API endpoint para obtener estadísticas actualizadas vía AJAX
   */
  static async getEstadisticas(req, res) {
    try {
      const [presupuestos, clientes, facturas, proyectos, certificados, leads] = await Promise.allSettled([
        PresupuestoModel.getEstadisticas(),
        ClienteModel.getEstadisticas(),
        FacturaModel.getEstadisticas(),
        ProyectoModel.getEstadisticas(),
        CertificadoModel.getEstadisticas(),
        LeadModel.getEstadisticas()
      ]);

      const stats = {
        presupuestos: presupuestos.status === 'fulfilled' ? presupuestos.value : {},
        clientes: clientes.status === 'fulfilled' ? clientes.value : {},
        facturas: facturas.status === 'fulfilled' ? facturas.value : {},
        proyectos: proyectos.status === 'fulfilled' ? proyectos.value : {},
        certificados: certificados.status === 'fulfilled' ? certificados.value : {},
        leads: leads.status === 'fulfilled' ? leads.value : {}
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Endpoint para obtener gráficos y métricas específicas
   */
  static async getMetricas(req, res) {
    try {
      const { tipo } = req.params;

      let data = {};

      switch (tipo) {
        case 'ventas':
          data = await this.getMetricasVentas();
          break;
        case 'proyectos':
          data = await this.getMetricasProyectos();
          break;
        case 'clientes':
          data = await this.getMetricasClientes();
          break;
        case 'financiero':
          data = await this.getMetricasFinancieras();
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Tipo de métrica no válido'
          });
      }

      res.json({
        success: true,
        data,
        tipo
      });

    } catch (error) {
      console.error(`Error al obtener métricas ${req.params.tipo}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Métricas específicas de ventas
   */
  static async getMetricasVentas() {
    const [presupuestos, leads] = await Promise.all([
      PresupuestoModel.getEstadisticas(),
      LeadModel.getEstadisticas()
    ]);

    return {
      pipeline_value: leads.valor_total_pipeline,
      closed_won: leads.valor_cerrado_ganado,
      conversion_rate: leads.tasa_conversion,
      presupuestos_aprobados: presupuestos.presupuestos_aprobados,
      tasa_aprobacion: presupuestos.tasa_aprobacion
    };
  }

  /**
   * Métricas específicas de proyectos
   */
  static async getMetricasProyectos() {
    const [proyectos, certificados] = await Promise.all([
      ProyectoModel.getEstadisticas(),
      CertificadoModel.getEstadisticas()
    ]);

    return {
      proyectos_activos: proyectos.proyectos_activos,
      proyectos_finalizados: proyectos.proyectos_finalizados,
      valor_certificado: certificados.valor_total_certificados,
      certificados_facturados: certificados.certificados_facturados
    };
  }

  /**
   * Métricas específicas de clientes
   */
  static async getMetricasClientes() {
    const clientes = await ClienteModel.getEstadisticas();
    
    return {
      total_clientes: clientes.total_clientes,
      clientes_activos: clientes.clientes_activos,
      nuevos_este_mes: clientes.nuevos_este_mes
    };
  }

  /**
   * Métricas financieras consolidadas
   */
  static async getMetricasFinancieras() {
    const [facturas, presupuestos, proyectos] = await Promise.all([
      FacturaModel.getEstadisticas(),
      PresupuestoModel.getEstadisticas(),
      ProyectoModel.getEstadisticas()
    ]);

    return {
      ingresos_facturados: facturas.valor_total_facturas,
      ingresos_pendientes: facturas.valor_pendiente,
      pipeline_presupuestos: presupuestos.valor_total,
      valor_proyectos: proyectos.valor_total_proyectos
    };
  }
}

module.exports = DashboardController;
