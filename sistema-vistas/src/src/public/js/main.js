// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
  // Crear el contenedor de notificaciones si no existe
  let notificaciones = document.getElementById('notificaciones');
  if (!notificaciones) {
    notificaciones = document.createElement('div');
    notificaciones.id = 'notificaciones';
    notificaciones.style.position = 'fixed';
    notificaciones.style.top = '20px';
    notificaciones.style.right = '20px';
    notificaciones.style.zIndex = '9999';
    document.body.appendChild(notificaciones);
  }

  // Crear la notificación
  const notificacion = document.createElement('div');
  notificacion.className = `alert alert-${tipo} alert-dismissible fade show`;
  notificacion.role = 'alert';
  notificacion.style.marginBottom = '10px';
  notificacion.style.minWidth = '300px';
  
  notificacion.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;

  // Agregar la notificación al contenedor
  notificaciones.appendChild(notificacion);

  // Eliminar la notificación después de 5 segundos
  setTimeout(() => {
    notificacion.classList.remove('show');
    setTimeout(() => {
      notificacion.remove();
    }, 150);
  }, 5000);
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  
  const opciones = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(fecha).toLocaleDateString('es-AR', opciones);
}

// Función para formatear moneda
function formatearMoneda(monto) {
  if (monto === null || monto === undefined) return '';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(monto);
}

// Inicialización cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar tooltips de Bootstrap
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Manejar la edición en línea de celdas
  document.querySelectorAll('[contenteditable="true"]').forEach(celda => {
    // Guardar el valor original al hacer clic
    celda.addEventListener('focus', function() {
      this.setAttribute('data-original-value', this.textContent.trim());
    });

    // Manejar el evento blur (cuando se pierde el foco)
    celda.addEventListener('blur', async function() {
      const id = this.closest('tr').dataset.id || this.dataset.id;
      const campo = this.dataset.field;
      const valor = this.textContent.trim();
      const valorOriginal = this.getAttribute('data-original-value');

      // Si el valor no cambió, no hacer nada
      if (valor === valorOriginal) return;

      try {
        const response = await fetch(`/facturas/emitidas/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campo, valor })
        });

        const data = await response.json();
        
        if (data.success) {
          mostrarNotificacion('Cambios guardados correctamente', 'success');
          
          // Actualizar el valor original
          this.setAttribute('data-original-value', valor);
          
          // Si es un campo de moneda, formatear el valor
          if (campo === 'monto' || campo.includes('precio') || campo.includes('importe')) {
            this.textContent = formatearMoneda(parseFloat(valor));
          }
        } else {
          throw new Error(data.error || 'Error al guardar los cambios');
        }
      } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message || 'Error al guardar los cambios', 'danger');
        // Revertir al valor original en caso de error
        this.textContent = valorOriginal;
      }
    });

    // Permitir solo números en campos numéricos
    celda.addEventListener('keydown', function(e) {
      if (this.dataset.numeric) {
        // Permitir: teclas de control, números y punto decimal
        if (
          [46, 8, 9, 27, 13, 110, 190].includes(e.keyCode) ||
          (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) || // Ctrl+A
          (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) || // Ctrl+C
          (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) || // Ctrl+V
          (e.keyCode >= 35 && e.keyCode <= 39) // Home, End, Left, Right
        ) {
          return;
        }
        
        // Asegurar que sea un número
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
        }
      }
    });
  });

  // Manejar cambios en los selectores de estado
  document.querySelectorAll('.estado-select').forEach(select => {
    select.addEventListener('change', async function() {
      const id = this.dataset.id;
      const valor = this.value;
      const valorAnterior = this.getAttribute('data-valor-anterior');
      
      // Si el valor no cambió, no hacer nada
      if (valor === valorAnterior) return;
      
      try {
        const response = await fetch(`/facturas/emitidas/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            campo: 'estado', 
            valor 
          })
        });

        const data = await response.json();
        
        if (data.success) {
          mostrarNotificacion('Estado actualizado correctamente', 'success');
          // Actualizar el valor anterior
          this.setAttribute('data-valor-anterior', valor);
        } else {
          throw new Error(data.error || 'Error al actualizar el estado');
        }
      } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message || 'Error al actualizar el estado', 'danger');
        // Revertir al valor anterior en caso de error
        this.value = valorAnterior;
      }
    });
  });

  // Inicializar DataTables si está disponible
  if (typeof $ !== 'undefined' && $.fn.DataTable) {
    $('.datatable').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
      },
      responsive: true,
      order: [[1, 'desc']] // Ordenar por la segunda columna (fecha) de forma descendente
    });
  }
});
