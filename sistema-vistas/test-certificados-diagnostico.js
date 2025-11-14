/**
 * SCRIPT DE DIAGNÓSTICO - MÓDULO DE CERTIFICADOS
 * ================================================
 * 
 * Problemas a diagnosticar:
 * 1. Certificados sin cliente (cliente_nombre = 'Sin cliente')
 * 2. Número de proyecto incorrecto o faltante
 * 3. Flujo de aprobación roto (no se pueden cambiar de estado)
 */

const pool = require('./src/config/database');

async function diagnosticoCertificados() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL MÓDULO DE CERTIFICADOS');
  console.log('='.repeat(80) + '\n');

  try {
    // ============================================
    // PROBLEMA 1: CERTIFICADOS SIN CLIENTE
    // ============================================
    console.log('\n📋 PROBLEMA 1: CERTIFICADOS SIN CLIENTE');
    console.log('-'.repeat(80));

    const [certificadosSinCliente] = await pool.query(`
      SELECT 
        c.id,
        c.numero,
        c.fecha,
        c.alcance,
        c.importe,
        c.estado,
        c.proyecto_id,
        p.id as proyecto_id_check,
        p.descripcion as proyecto_nombre,
        p.personal_id,
        pt.id as cliente_id,
        pt.nombre as cliente_nombre,
        pt.apellido as cliente_apellido
      FROM certificacions c
      LEFT JOIN proyectos p ON c.proyecto_id = p.id
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      WHERE c.activo = 1
      ORDER BY c.numero DESC
      LIMIT 20
    `);

    console.log(`\n✅ Total de certificados analizados: ${certificadosSinCliente.length}`);
    
    const conProblema = certificadosSinCliente.filter(c => !c.cliente_id || !c.cliente_nombre);
    console.log(`⚠️  Certificados sin cliente: ${conProblema.length}`);

    if (conProblema.length > 0) {
      console.log('\n📌 Certificados con problema:');
      conProblema.forEach(c => {
        console.log(`
  Certificado #${c.numero}:
    - ID: ${c.id}
    - Proyecto: ${c.proyecto_nombre || 'SIN PROYECTO'} (ID: ${c.proyecto_id})
    - Cliente ID: ${c.cliente_id || 'NULL'}
    - Cliente Nombre: ${c.cliente_nombre || 'NULL'}
    - Cliente Apellido: ${c.cliente_apellido || 'NULL'}
    - Estado: ${c.estado}
    - Importe: ${c.importe}
        `);
      });
    }

    // ============================================
    // PROBLEMA 2: NÚMERO DE PROYECTO INCORRECTO
    // ============================================
    console.log('\n\n📊 PROBLEMA 2: NÚMERO DE PROYECTO INCORRECTO');
    console.log('-'.repeat(80));

    const [certificadosProyecto] = await pool.query(`
      SELECT 
        c.id,
        c.numero as numero_certificado,
        c.proyecto_id,
        p.id as proyecto_id_real,
        p.codigo as proyecto_codigo,
        p.descripcion as proyecto_nombre,
        p.numero as proyecto_numero,
        c.estado,
        c.fecha
      FROM certificacions c
      LEFT JOIN proyectos p ON c.proyecto_id = p.id
      WHERE c.activo = 1
      ORDER BY c.numero DESC
      LIMIT 20
    `);

    console.log(`\n✅ Total de certificados con proyecto: ${certificadosProyecto.length}`);
    
    const sinProyecto = certificadosProyecto.filter(c => !c.proyecto_id);
    const conProyectoIncorrecto = certificadosProyecto.filter(c => c.proyecto_id && !c.proyecto_codigo);

    console.log(`⚠️  Certificados sin proyecto: ${sinProyecto.length}`);
    console.log(`⚠️  Certificados con proyecto pero sin código: ${conProyectoIncorrecto.length}`);

    if (sinProyecto.length > 0) {
      console.log('\n📌 Certificados sin proyecto:');
      sinProyecto.forEach(c => {
        console.log(`  Certificado #${c.numero_certificado}: proyecto_id = NULL`);
      });
    }

    if (conProyectoIncorrecto.length > 0) {
      console.log('\n📌 Certificados con proyecto pero sin código:');
      conProyectoIncorrecto.forEach(c => {
        console.log(`
  Certificado #${c.numero_certificado}:
    - Proyecto ID: ${c.proyecto_id}
    - Proyecto Nombre: ${c.proyecto_nombre}
    - Proyecto Código: ${c.proyecto_codigo || 'NULL'}
        `);
      });
    }

    // ============================================
    // PROBLEMA 3: FLUJO DE APROBACIÓN
    // ============================================
    console.log('\n\n🔄 PROBLEMA 3: FLUJO DE APROBACIÓN');
    console.log('-'.repeat(80));

    const [estadisticas] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as aprobados,
        SUM(CASE WHEN estado = 2 THEN 1 ELSE 0 END) as facturados,
        SUM(CASE WHEN estado = 3 THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 4 THEN 1 ELSE 0 END) as anulados
      FROM certificacions
      WHERE activo = 1
    `);

    const stats = estadisticas[0];
    console.log(`
✅ Distribución de estados:
  - Total: ${stats.total}
  - Pendientes (0): ${stats.pendientes}
  - Aprobados (1): ${stats.aprobados}
  - Facturados (2): ${stats.facturados}
  - En Proceso (3): ${stats.en_proceso}
  - Anulados (4): ${stats.anulados}
    `);

    // Verificar si hay certificados que no pueden cambiar de estado
    const [certificadosPendientes] = await pool.query(`
      SELECT 
        c.id,
        c.numero,
        c.estado,
        c.fecha,
        c.importe,
        p.descripcion as proyecto_nombre,
        pt.nombre as cliente_nombre
      FROM certificacions c
      LEFT JOIN proyectos p ON c.proyecto_id = p.id
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      WHERE c.activo = 1 AND c.estado = 0
      ORDER BY c.fecha DESC
      LIMIT 10
    `);

    console.log(`\n📌 Certificados pendientes de aprobación (últimos 10):`);
    if (certificadosPendientes.length === 0) {
      console.log('  ✅ No hay certificados pendientes');
    } else {
      certificadosPendientes.forEach(c => {
        console.log(`
  Certificado #${c.numero}:
    - ID: ${c.id}
    - Estado: ${c.estado} (Pendiente)
    - Proyecto: ${c.proyecto_nombre || 'SIN PROYECTO'}
    - Cliente: ${c.cliente_nombre || 'SIN CLIENTE'}
    - Importe: ${c.importe}
    - Fecha: ${c.fecha}
        `);
      });
    }

    // ============================================
    // VERIFICACIÓN DE INTEGRIDAD DE BD
    // ============================================
    console.log('\n\n🔧 VERIFICACIÓN DE INTEGRIDAD DE BD');
    console.log('-'.repeat(80));

    const [integridad] = await pool.query(`
      SELECT 
        'certificacions' as tabla,
        COUNT(*) as total_registros,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN proyecto_id IS NULL THEN 1 ELSE 0 END) as sin_proyecto
      FROM certificacions
      UNION ALL
      SELECT 
        'proyectos' as tabla,
        COUNT(*) as total_registros,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN personal_id IS NULL THEN 1 ELSE 0 END) as sin_cliente
      FROM proyectos
      UNION ALL
      SELECT 
        'persona_terceros' as tabla,
        COUNT(*) as total_registros,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
        0 as sin_proyecto
      FROM persona_terceros
    `);

    console.log('\n✅ Estado de tablas:');
    integridad.forEach(row => {
      console.log(`
  ${row.tabla}:
    - Total: ${row.total_registros}
    - Activos: ${row.activos}
    - Sin relación: ${row.sin_proyecto || row.sin_cliente || 0}
      `);
    });

    // ============================================
    // RESUMEN Y RECOMENDACIONES
    // ============================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📝 RESUMEN Y RECOMENDACIONES');
    console.log('='.repeat(80));

    const problemas = [];

    if (conProblema.length > 0) {
      problemas.push(`❌ ${conProblema.length} certificados sin cliente`);
    }
    if (sinProyecto.length > 0) {
      problemas.push(`❌ ${sinProyecto.length} certificados sin proyecto`);
    }
    if (conProyectoIncorrecto.length > 0) {
      problemas.push(`❌ ${conProyectoIncorrecto.length} certificados con proyecto sin código`);
    }
    if (stats.pendientes === 0 && stats.aprobados === 0) {
      problemas.push('❌ No hay certificados en estado Pendiente o Aprobado (posible problema en flujo)');
    }

    if (problemas.length === 0) {
      console.log('\n✅ No se detectaron problemas críticos');
    } else {
      console.log('\n⚠️  PROBLEMAS DETECTADOS:');
      problemas.forEach(p => console.log(`  ${p}`));
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar diagnóstico
diagnosticoCertificados().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
