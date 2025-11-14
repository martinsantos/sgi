/**
 * SCRIPT DE CORRECCIÓN - CERTIFICADOS SIN CLIENTE
 * ================================================
 * 
 * Problema: Los certificados no muestran cliente porque el proyecto
 * no tiene personal_id asignado.
 * 
 * Solución: Asignar personal_id a los proyectos que no lo tienen,
 * basándose en presupuestos relacionados o datos disponibles.
 */

const pool = require('./src/config/database');

async function fixCertificadosClientes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 CORRECCIÓN: CERTIFICADOS SIN CLIENTE');
  console.log('='.repeat(80) + '\n');

  let connection;
  try {
    connection = await pool.getConnection();

    // ============================================
    // PASO 1: Identificar proyectos sin cliente
    // ============================================
    console.log('📋 PASO 1: Identificando proyectos sin cliente...\n');

    const [proyectosSinCliente] = await connection.query(`
      SELECT 
        p.id,
        p.descripcion,
        p.personal_id,
        p.presupuesto_id,
        COUNT(c.id) as total_certificados
      FROM proyectos p
      LEFT JOIN certificacions c ON p.id = c.proyecto_id AND c.activo = 1
      WHERE p.personal_id IS NULL AND p.activo = 1
      GROUP BY p.id
      ORDER BY total_certificados DESC
    `);

    console.log(`✅ Proyectos sin cliente: ${proyectosSinCliente.length}\n`);

    if (proyectosSinCliente.length === 0) {
      console.log('✅ No hay proyectos sin cliente. ¡Problema resuelto!');
      return;
    }

    // ============================================
    // PASO 2: Intentar obtener cliente del presupuesto
    // ============================================
    console.log('📋 PASO 2: Buscando cliente en presupuestos relacionados...\n');

    let actualizados = 0;

    for (const proyecto of proyectosSinCliente) {
      console.log(`\n  Proyecto: ${proyecto.descripcion} (${proyecto.total_certificados} certificados)`);
      
      let clienteId = null;

      // Buscar cliente del presupuesto relacionado
      if (proyecto.presupuesto_id) {
        const [presupuesto] = await connection.query(`
          SELECT cliente_id FROM presupuestos WHERE id = ?
        `, [proyecto.presupuesto_id]);

        if (presupuesto.length > 0 && presupuesto[0].cliente_id) {
          clienteId = presupuesto[0].cliente_id;
          console.log(`    ✅ Cliente encontrado en presupuesto: ${clienteId}`);
        }
      }

      // Si no hay cliente en presupuesto, buscar en certificados del proyecto
      if (!clienteId) {
        const [certificados] = await connection.query(`
          SELECT DISTINCT pt.id, pt.nombre
          FROM certificacions c
          LEFT JOIN persona_terceros pt ON c.proyecto_id = ? AND pt.id IS NOT NULL
          WHERE c.proyecto_id = ? AND c.activo = 1
          LIMIT 1
        `, [proyecto.id, proyecto.id]);

        if (certificados.length > 0 && certificados[0].id) {
          clienteId = certificados[0].id;
          console.log(`    ✅ Cliente encontrado en certificados: ${clienteId}`);
        }
      }

      // Si encontramos cliente, actualizar el proyecto
      if (clienteId) {
        try {
          const [result] = await connection.query(`
            UPDATE proyectos 
            SET personal_id = ?, modified = NOW()
            WHERE id = ?
          `, [clienteId, proyecto.id]);

          if (result.affectedRows > 0) {
            actualizados++;
            console.log(`    ✅ Proyecto actualizado con cliente ${clienteId}`);
          }
        } catch (error) {
          console.log(`    ❌ Error al actualizar: ${error.message}`);
        }
      } else {
        console.log(`    ⚠️  No se encontró cliente para este proyecto`);
      }
    }

    console.log(`\n\n✅ Proyectos actualizados: ${actualizados}/${proyectosSinCliente.length}`);

    // ============================================
    // PASO 3: Verificar resultado
    // ============================================
    console.log('\n📋 PASO 3: Verificando resultado...\n');

    const [certificadosSinCliente] = await connection.query(`
      SELECT COUNT(*) as total
      FROM certificacions c
      LEFT JOIN proyectos p ON c.proyecto_id = p.id
      LEFT JOIN persona_terceros pt ON p.personal_id = pt.id
      WHERE c.activo = 1 AND pt.id IS NULL
    `);

    const totalSinCliente = certificadosSinCliente[0]?.total || 0;
    console.log(`✅ Certificados sin cliente después de corrección: ${totalSinCliente}`);

    if (totalSinCliente === 0) {
      console.log('\n🎉 ¡PROBLEMA RESUELTO! Todos los certificados tienen cliente asignado.');
    } else {
      console.log(`\n⚠️  Aún hay ${totalSinCliente} certificados sin cliente.`);
      console.log('   Estos pueden necesitar asignación manual.');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    if (connection) {
      await connection.release();
    }
    await pool.end();
  }
}

// Ejecutar corrección
fixCertificadosClientes().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
