/**
 * Gestor de Facturas Recibidas
 * Maneja carga, filtrado, búsqueda, ordenamiento y paginación
 */

class FacturasRecibidasManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 20;
    this.currentFilters = {};
    this.currentSort = 'fecha_compra';
    this.currentOrder = 'desc';
    this.allFacturas = [];
    this.filteredFacturas = [];
    this.init();
  }

  init() {
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('facturasSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentPage = 1;
        this.currentFilters.search = e.target.value;
        this.loadData();
      });
    }

    // Limpiar búsqueda
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.currentPage = 1;
        this.currentFilters.search = '';
        this.loadData();
      });
    }

    // Filtros avanzados
    const advancedForm = document.getElementById('advancedFiltersForm');
    if (advancedForm) {
      advancedForm.addEventListener('change', () => {
        this.currentPage = 1;
        this.applyAdvancedFilters();
        this.loadData();
      });
    }

    // Limpiar filtros
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (advancedForm) advancedForm.reset();
        this.currentPage = 1;
        this.currentFilters = {};
        if (searchInput) searchInput.value = '';
        this.loadData();
      });
    }

    // Ordenamiento por columnas
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const sortField = e.currentTarget.dataset.sort;
        if (sortField) {
          this.currentPage = 1;
          if (this.currentSort === sortField) {
            this.currentOrder = this.currentOrder === 'asc' ? 'desc' : 'asc';
          } else {
            this.currentSort = sortField;
            this.currentOrder = 'desc';
          }
          this.updateSortIndicators();
          this.loadData();
        }
      });
    });
  }

  applyAdvancedFilters() {
    const form = document.getElementById('advancedFiltersForm');
    if (!form) return;

    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
      if (value) {
        this.currentFilters[key] = value;
      } else {
        delete this.currentFilters[key];
      }
    }
  }

  updateSortIndicators() {
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
      if (header.dataset.sort === this.currentSort) {
        header.classList.add(`sort-${this.currentOrder}`);
      }
    });
  }

  async loadData() {
    try {
      this.showLoading(true);

      // Construir parámetros de búsqueda
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.limit,
        sort: this.currentSort,
        order: this.currentOrder,
        ...this.currentFilters
      });

      const response = await fetch(`/api/facturas/recibidas?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.allFacturas = result.data || [];
      this.renderTable();
      this.renderPagination(result.pagination);
      this.updateResultsInfo(result.pagination);

    } catch (error) {
      console.error('Error al cargar facturas:', error);
      this.showError('Error al cargar las facturas. Por favor, intenta nuevamente.');
    } finally {
      this.showLoading(false);
    }
  }

  renderTable() {
    const tbody = document.getElementById('facturasTableBody');
    if (!tbody) return;

    if (this.allFacturas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <i class="fas fa-inbox text-muted" style="font-size: 2rem;"></i>
            <div class="mt-2 text-muted">No se encontraron facturas</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.allFacturas.map(factura => `
      <tr>
        <td>
          <strong>${factura.numero_factura || 'N/A'}</strong>
          <br>
          <small class="text-muted">${factura.tipo_factura || ''}</small>
        </td>
        <td>${this.formatDate(factura.fecha_compra)}</td>
        <td>
          <div>${factura.proveedor_nombre || 'Sin proveedor'}</div>
          <small class="text-muted">${factura.proveedor_codigo || ''}</small>
        </td>
        <td>${factura.tipo_factura || 'N/A'}</td>
        <td>
          <span class="badge ${this.getEstadoBadgeClass(factura.estado)}">
            ${this.getEstadoNombre(factura.estado)}
          </span>
        </td>
        <td class="text-end">
          <strong>${this.formatCurrency(factura.total)}</strong>
        </td>
        <td class="text-end">
          <div>${this.formatCurrency(factura.pagado || 0)}</div>
          <small class="text-muted">${this.formatCurrency(factura.saldo_pendiente || 0)}</small>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <a href="/facturas/recibidas/${factura.id}" class="btn btn-outline-primary" title="Ver">
              <i class="fas fa-eye"></i>
            </a>
            <a href="/facturas/recibidas/editar/${factura.id}" class="btn btn-outline-warning" title="Editar">
              <i class="fas fa-edit"></i>
            </a>
            <button class="btn btn-outline-danger" onclick="confirmarEliminar('${factura.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderPagination(pagination) {
    const paginationDiv = document.getElementById('facturasPagination');
    if (!paginationDiv || !pagination) return;

    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = '<nav><ul class="pagination mb-0">';

    // Botón anterior
    if (page > 1) {
      html += `<li class="page-item"><a class="page-link" onclick="window.facturasRecibidasManager.goToPage(${page - 1})">Anterior</a></li>`;
    } else {
      html += '<li class="page-item disabled"><span class="page-link">Anterior</span></li>';
    }

    // Números de página
    const maxButtons = 5;
    const halfMax = Math.floor(maxButtons / 2);
    let startPage = Math.max(1, page - halfMax);
    let endPage = Math.min(pages, page + halfMax);

    if (endPage - startPage < maxButtons - 1) {
      if (startPage === 1) {
        endPage = Math.min(pages, startPage + maxButtons - 1);
      } else {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i === page) {
        html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
      } else {
        html += `<li class="page-item"><a class="page-link" onclick="window.facturasRecibidasManager.goToPage(${i})">${i}</a></li>`;
      }
    }

    // Botón siguiente
    if (page < pages) {
      html += `<li class="page-item"><a class="page-link" onclick="window.facturasRecibidasManager.goToPage(${page + 1})">Siguiente</a></li>`;
    } else {
      html += '<li class="page-item disabled"><span class="page-link">Siguiente</span></li>';
    }

    html += '</ul></nav>';
    paginationDiv.innerHTML = html;
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateResultsInfo(pagination) {
    if (!pagination) return;

    const { page, limit, total, pages } = pagination;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    const infoText = `Mostrando ${from} a ${to} de ${total} facturas`;
    
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) resultsInfo.textContent = infoText;

    const resultsInfoFooter = document.getElementById('resultsInfoFooter');
    if (resultsInfoFooter) resultsInfoFooter.textContent = infoText;
  }

  showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      indicator.style.display = show ? 'block' : 'none';
    }
  }

  showError(message) {
    const tbody = document.getElementById('facturasTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <div class="alert alert-danger mb-0">${message}</div>
          </td>
        </tr>
      `;
    }
  }

  formatDate(date) {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('es-AR');
    } catch (error) {
      return 'N/A';
    }
  }

  formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '$0,00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  }

  getEstadoNombre(estado) {
    const estados = {
      1: 'Pendiente',
      2: 'Pagada Parcial',
      3: 'Pagada',
      4: 'En Proceso',
      5: 'Anulada'
    };
    return estados[estado] || 'Desconocido';
  }

  getEstadoBadgeClass(estado) {
    const clases = {
      1: 'bg-warning',      // Pendiente
      2: 'bg-info',         // Pagada Parcial
      3: 'bg-success',      // Pagada
      4: 'bg-primary',      // En Proceso
      5: 'bg-danger'        // Anulada
    };
    return clases[estado] || 'bg-secondary';
  }
}

// Inicializar el gestor cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.facturasRecibidasManager = new FacturasRecibidasManager();
  window.facturasRecibidasManager.loadData();
});

// Función auxiliar para confirmar eliminación
function confirmarEliminar(id) {
  if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
    fetch(`/api/facturas/${id}`, { method: 'DELETE' })
      .then(response => {
        if (response.ok) {
          window.facturasRecibidasManager.loadData();
        } else {
          alert('Error al eliminar la factura');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al eliminar la factura');
      });
  }
}
