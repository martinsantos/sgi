const express = require('express');
const router = express.Router();

/**
 * Rutas básicas para módulos no implementados completamente
 */

// Función helper para renderizar páginas básicas
const renderBasicPage = (title, message, breadcrumbs = []) => {
  return (req, res) => {
    res.render('modulos/basico', {
      title,
      message,
      breadcrumbs,
      moduleInfo: {
        status: 'En desarrollo',
        lastUpdate: new Date().toLocaleDateString('es-AR')
      }
    });
  };
};

// Rutas de Proyectos
router.get('/planificacion', renderBasicPage(
  'Planificación de Proyectos',
  'Módulo de planificación y cronogramas de proyectos',
  [{ name: 'Proyectos', url: '/proyectos' }, { name: 'Planificación' }]
));

// Rutas de Materiales
router.get('/materiales', renderBasicPage(
  'Lista de Materiales',
  'Gestión de materiales y recursos para proyectos',
  [{ name: 'Materiales' }]
));

// Rutas de Abastecimiento
router.get('/requerimientos', renderBasicPage(
  'Requerimientos',
  'Gestión de requerimientos de materiales y servicios',
  [{ name: 'Abastecimiento', url: '#' }, { name: 'Requerimientos' }]
));

router.get('/cotizaciones', renderBasicPage(
  'Cotizaciones',
  'Gestión de cotizaciones de proveedores',
  [{ name: 'Abastecimiento', url: '#' }, { name: 'Cotizaciones' }]
));

router.get('/ordenes-compra', renderBasicPage(
  'Órdenes de Compra',
  'Gestión de órdenes de compra y seguimiento',
  [{ name: 'Abastecimiento', url: '#' }, { name: 'Órdenes de Compra' }]
));

router.get('/acopios', renderBasicPage(
  'Acopios',
  'Control de acopios y almacenamiento',
  [{ name: 'Abastecimiento', url: '#' }, { name: 'Acopios' }]
));

// Ruta de Contabilidad
router.get('/contabilidad', renderBasicPage(
  'Contabilidad',
  'Módulo de gestión contable y reportes financieros',
  [{ name: 'Finanzas', url: '#' }, { name: 'Contabilidad' }]
));

module.exports = router;
