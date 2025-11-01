/**
 * TEST INTEGRAL: CERTIFICADOS ASOCIADOS A PROYECTOS
 * Verifica que los certificados estén correctamente asociados a proyectos
 */

const pool = require('./src/config/database');

async function testCertificadosProyectos() {
  console.log('🧪 TEST INTEGRAL: CERTIFICADOS ASOCIADOS A PROYECTOS');
  console.log('======================================================');
  console.log('');

  try {
    // Test 1: Verificar estructura de tabla certificacions
    console.log('1️⃣ VERIFICAR ESTRUCTURA DE TABLA certificacions');
    console.log('=================================================');
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM certificacions LIKE 'proyecto_id'
    `);
    console.log('✅ Columna proyecto_id existe:', columns.length > 0);
    console.log('   Tipo:', columns[0]?.Type);
    console.log('   Null:', columns[0]?.Null);
    console.log('');

    // Test 2: Contar certificados por proyecto
    console.log('2️⃣ CONTAR CERTIFICADOS POR PROYECTO');
    console.log('====================================');
    const [proyectosCerts] = await pool.query(`
      SELECT 
        p.id as proyecto_id,
        p.descripcion as proyecto,
        COUNT(c.id) as total_certificados,
        SUM(CASE WHEN c.activo = 1 THEN 1 ELSE 0 END) as certificados_activos,
        SUM(CASE WHEN c.activo = 0 THEN 1 ELSE 0 END) as certificados_inactivos
      FROM proyectos p
      LEFT JOIN certificacions c ON p.id = c.proyecto_id
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_certificados DESC
      LIMIT 10
    `);
    console.log('Proyectos con certificados:');
    proyectosCerts.forEach(p => {
      console.log(`   - ${p.proyecto}: ${p.total_certificados} certificados (${p.certificados_activos} activos, ${p.certificados_inactivos} inactivos)`);
    });
    console.log('');

    // Test 3: Verificar certificados SIN proyecto
    console.log('3️⃣ VERIFICAR CERTIFICADOS SIN PROYECTO');
    console.log('=======================================');
    const [certsSinProyectoResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM certificacions
      WHERE proyecto_id IS NULL OR proyecto_id = ''
    `);
    console.log(`   Certificados sin proyecto: ${certsSinProyectoResult[0].total}`);
    if (certsSinProyectoResult[0].total > 0) {
      console.log('   ⚠️ ADVERTENCIA: Hay certificados sin proyecto asociado');
      const [ejemplos] = await pool.query(`
        SELECT id, numero, fecha, importe
        FROM certificacions
        WHERE proyecto_id IS NULL OR proyecto_id = ''
        LIMIT 5
      `);
      console.log('   Ejemplos:');
      ejemplos.forEach(c => {
        console.log(`      - Cert #${c.numero} (${c.fecha}): $${c.importe}`);
      });
    } else {
      console.log('   ✅ Todos los certificados tienen proyecto asociado');
    }
    console.log('');

    // Test 4: Verificar proyectos SIN certificados
    console.log('4️⃣ VERIFICAR PROYECTOS SIN CERTIFICADOS');
    console.log('========================================');
    const [proyectosSinCertsResult] = await pool.query(`
      SELECT 
        p.id,
        p.descripcion,
        COUNT(c.id) as total_certificados
      FROM proyectos p
      LEFT JOIN certificacions c ON p.id = c.proyecto_id
      WHERE p.activo = 1
      GROUP BY p.id
      HAVING total_certificados = 0
      LIMIT 10
    `);
    console.log(`   Proyectos sin certificados: ${proyectosSinCertsResult.length}`);
    if (proyectosSinCertsResult.length > 0) {
      console.log('   Ejemplos:');
      proyectosSinCertsResult.forEach(p => {
        console.log(`      - ${p.descripcion}`);
      });
    } else {
      console.log('   ✅ Todos los proyectos tienen certificados');
    }
    console.log('');

    // Test 5: Verificar certificados de un proyecto específico
    console.log('5️⃣ VERIFICAR CERTIFICADOS DE UN PROYECTO ESPECÍFICO');
    console.log('====================================================');
    const [primerProyecto] = await pool.query(`
      SELECT id, descripcion
      FROM proyectos
      WHERE activo = 1
      ORDER BY fecha_inicio DESC
      LIMIT 1
    `);
    
    if (primerProyecto.length > 0) {
      const proyecto = primerProyecto[0];
      console.log(`   Proyecto: ${proyecto.descripcion}`);
      console.log(`   ID: ${proyecto.id}`);
      
      const [certs] = await pool.query(`
        SELECT 
          c.id,
          c.numero,
          c.fecha,
          c.importe,
          c.estado,
          c.activo,
          CASE c.estado
            WHEN 0 THEN 'Pendiente'
            WHEN 1 THEN 'Aprobado'
            WHEN 2 THEN 'Facturado'
            WHEN 3 THEN 'En Proceso'
            WHEN 4 THEN 'Anulado'
            ELSE 'Desconocido'
          END as estado_nombre
        FROM certificacions c
        WHERE c.proyecto_id = ?
        ORDER BY c.fecha DESC
      `, [proyecto.id]);
      
      console.log(`   Total certificados: ${certs.length}`);
      if (certs.length > 0) {
        console.log('   Certificados:');
        certs.forEach(c => {
          console.log(`      - #${c.numero} | ${c.fecha} | ${c.estado_nombre} | $${c.importe} | ${c.activo ? 'Activo' : 'Inactivo'}`);
        });
      } else {
        console.log('   ⚠️ Este proyecto no tiene certificados');
      }
    }
    console.log('');

    // Test 6: Verificar integridad de asociaciones
    console.log('6️⃣ VERIFICAR INTEGRIDAD DE ASOCIACIONES');
    console.log('========================================');
    const [stats] = await pool.query(`
      SELECT 
        'Total Proyectos Activos' as tipo,
        COUNT(*) as cantidad
      FROM proyectos
      WHERE activo = 1
      UNION ALL
      SELECT 
        'Total Certificados' as tipo,
        COUNT(*) as cantidad
      FROM certificacions
      UNION ALL
      SELECT 
        'Certificados con Proyecto' as tipo,
        COUNT(*) as cantidad
      FROM certificacions
      WHERE proyecto_id IS NOT NULL AND proyecto_id != ''
      UNION ALL
      SELECT 
        'Certificados sin Proyecto' as tipo,
        COUNT(*) as cantidad
      FROM certificacions
      WHERE proyecto_id IS NULL OR proyecto_id = ''
    `);
    
    console.log('Estadísticas:');
    stats.forEach(s => {
      console.log(`   ${s.tipo}: ${s.cantidad}`);
    });
    console.log('');

    // Test 7: Verificar que el método getCertificadosProyecto funciona
    console.log('7️⃣ VERIFICAR MÉTODO getCertificadosProyecto()');
    console.log('==============================================');
    const ProyectoModel = require('./src/models/ProyectoModel');
    
    if (primerProyecto.length > 0) {
      const proyecto = primerProyecto[0];
      const certificados = await ProyectoModel.getCertificadosProyecto(proyecto.id);
      
      console.log(`   Proyecto: ${proyecto.descripcion}`);
      console.log(`   Total certificados: ${certificados.total}`);
      console.log(`   Certificados activos: ${certificados.total_activos}`);
      console.log(`   Certificados inactivos: ${certificados.total_inactivos}`);
      
      if (certificados.activos.length > 0) {
        console.log('   ✅ Método getCertificadosProyecto() funciona correctamente');
      } else {
        console.log('   ⚠️ No se encontraron certificados activos');
      }
    }
    console.log('');

    // Test 8: Verificar que getProyectos() retorna certificados
    console.log('8️⃣ VERIFICAR MÉTODO getProyectos()');
    console.log('===================================');
    const resultado = await ProyectoModel.getProyectos(1, 5);
    
    console.log(`   Total proyectos: ${resultado.data.length}`);
    console.log('   Proyectos con certificados_detalle:');
    
    let proyectosConCerts = 0;
    let proyectosSinCerts = 0;
    
    resultado.data.forEach(p => {
      if (p.certificados_detalle && p.certificados_detalle.total > 0) {
        proyectosConCerts++;
        console.log(`      ✅ ${p.descripcion}: ${p.certificados_detalle.total} certificados`);
      } else {
        proyectosSinCerts++;
        console.log(`      ⚠️ ${p.descripcion}: Sin certificados`);
      }
    });
    
    console.log(`   Proyectos con certificados: ${proyectosConCerts}`);
    console.log(`   Proyectos sin certificados: ${proyectosSinCerts}`);
    console.log('');

    // Resumen final
    console.log('======================================================');
    console.log('📊 RESUMEN FINAL');
    console.log('======================================================');
    
    const totalProyectos = resultado.pagination.total;
    const totalCertificados = stats.find(s => s.tipo === 'Total Certificados')?.cantidad || 0;
    const certsConProyecto = stats.find(s => s.tipo === 'Certificados con Proyecto')?.cantidad || 0;
    const certsSinProyecto = stats.find(s => s.tipo === 'Certificados sin Proyecto')?.cantidad || 0;
    
    console.log(`Total Proyectos Activos: ${totalProyectos}`);
    console.log(`Total Certificados: ${totalCertificados}`);
    console.log(`Certificados con Proyecto: ${certsConProyecto} (${((certsConProyecto/totalCertificados)*100).toFixed(2)}%)`);
    console.log(`Certificados sin Proyecto: ${certsSinProyecto} (${((certsSinProyecto/totalCertificados)*100).toFixed(2)}%)`);
    console.log('');
    
    if (certsSinProyecto === 0 && proyectosConCerts > 0) {
      console.log('✅ TODOS LOS TESTS PASADOS');
      console.log('✅ Los certificados están correctamente asociados a proyectos');
      console.log('✅ Los proyectos tienen certificados asociados');
    } else {
      console.log('⚠️ ADVERTENCIAS ENCONTRADAS');
      if (certsSinProyecto > 0) {
        console.log(`   - Hay ${certsSinProyecto} certificados sin proyecto asociado`);
      }
      if (proyectosSinCerts > 0) {
        console.log(`   - Hay ${proyectosSinCerts} proyectos sin certificados`);
      }
    }

  } catch (error) {
    console.error('❌ ERROR EN TEST:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar test
testCertificadosProyectos();
