const {  
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  truncateText,
  getStatusBadgeClass,
  getStatusName,
  daysBetween,
  isOverdue,
  getRelativeTime,
  serialize
} = require('./formatters');

module.exports = {
  // === FORMATTERS ===
  formatCurrency: (amount) => formatCurrency(amount),
  formatDate: (date) => formatDate(date),
  formatDateTime: (date) => formatDateTime(date),
  formatNumber: (number) => formatNumber(number),
  formatPercentage: (value, decimals = 1) => formatPercentage(value, decimals),
  truncateText: (text, length = 50) => truncateText(text, length),
  
  // === COMPARISONS ===
  eq: (a, b) => a == b,
  ne: (a, b) => a != b,
  gt: (a, b) => parseFloat(a) > parseFloat(b),
  gte: (a, b) => parseFloat(a) >= parseFloat(b),
  lt: (a, b) => parseFloat(a) < parseFloat(b),
  lte: (a, b) => parseFloat(a) <= parseFloat(b),
  
  // === LOGICAL OPERATIONS ===
  and: (a, b) => a && b,
  or: (a, b) => a || b,
  not: (value) => !value,
  
  // === MATH OPERATIONS ===
  add: (a, b) => parseFloat(a) + parseFloat(b),
  subtract: (a, b) => parseFloat(a) - parseFloat(b),
  multiply: (a, b) => parseFloat(a) * parseFloat(b),
  divide: (a, b) => parseFloat(a) / parseFloat(b),
  
  math: function(a, operator, b, operation2, c, options) {
    let result = parseFloat(a);
    const operations = [];
    
    for (let i = 1; i < arguments.length - 1; i += 2) {
      if (typeof arguments[i] === 'string') {
        operations.push({
          operator: arguments[i],
          value: parseFloat(arguments[i + 1])
        });
      }
    }
    
    operations.forEach(op => {
      switch (op.operator) {
        case '+': result += op.value; break;
        case '-': result -= op.value; break;
        case '*': result *= op.value; break;
        case '/': result = op.value !== 0 ? result / op.value : 0; break;
        case '%': result = result % op.value; break;
      }
    });
    
    const opts = arguments[arguments.length - 1];
    const precision = opts.hash && opts.hash.precision ? opts.hash.precision : 2;
    
    return parseFloat(result.toFixed(precision));
  },
  
  // === STATUS AND BADGES ===
  getStatusBadge: (status) => getStatusBadgeClass(status),
  getStatusName: (status) => getStatusName(status),
  
  // === ARRAYS AND COLLECTIONS ===
  isEmpty: (collection) => {
    if (!collection) return true;
    if (Array.isArray(collection)) return collection.length === 0;
    if (typeof collection === 'object') return Object.keys(collection).length === 0;
    return !collection;
  },
  
  length: (collection) => {
    if (!collection) return 0;
    if (Array.isArray(collection)) return collection.length;
    if (typeof collection === 'object') return Object.keys(collection).length;
    return 0;
  },
  
  first: (collection) => {
    if (!collection || !Array.isArray(collection)) return null;
    return collection[0];
  },
  
  last: (collection) => {
    if (!collection || !Array.isArray(collection)) return null;
    return collection[collection.length - 1];
  },
  
  // === DATE AND TIME ===
  daysBetween: (from, to) => daysBetween(from, to),
  isOverdue: (date) => isOverdue(date),
  getRelativeTime: (date) => getRelativeTime(date),
  
  dateRange: (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  },
  
  // === URL AND SERIALIZATION ===
  serialize: (obj) => serialize(obj),
  
  // === UTILITY ===
  json: (context) => JSON.stringify(context, null, 2),
  
  debug: function(value) {
    console.log('Handlebars Debug:', value);
    return value;
  },
  
  // Concatenar strings
  concat: function() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.join('');
  },
  
  // Fusionar objetos
  merge: function(obj1, obj2) {
    return Object.assign({}, obj1 || {}, obj2 || {});
  },
  
  range: function(from, to, incr = 1) {
    const result = [];
    for (let i = from; i <= to; i += incr) {
      result.push(i);
    }
    return result;
  },
  
  times: function(n, block) {
    let accum = '';
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  },
  
  // === LEGACY COMPATIBILITY ===
  uppercase: function(text) {
    return typeof text === 'string' ? text.toUpperCase() : '';
  },
  
  lowercase: function(text) {
    return typeof text === 'string' ? text.toLowerCase() : '';
  },
  
  truncate: function(text, length) {
    return truncateText(text, length);
  },
  
  nl2br: function(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/\n/g, '<br>');
  },
  
  // === MISSING HELPERS ===
  getBadgeClass: function(tipo_persona) {
    return tipo_persona === 'Física' ? 'bg-info' : 'bg-success';
  },
  
  calcularPorcentaje: function(parte, total) {
    if (!total || total === 0) return 0;
    return Math.round((parte / total) * 100);
  },
  
  getCondicionIva: function(condicion) {
    const condiciones = {
      1: 'IVA Responsable Inscripto',
      2: 'IVA Responsable No Inscripto', 
      3: 'IVA Exento',
      4: 'No Responsable',
      5: 'Consumidor Final',
      6: 'Responsable Monotributo',
      7: 'Sujeto No Categorizado'
    };
    return condiciones[condicion] || 'No definida';
  },
  toTimestamp: function(date) {
    if (!date) return '';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.getTime();
  },
  
  // Helper para substring
  substring: function(str, start, end) {
    if (typeof str !== 'string') return '';
    return str.substring(start, end || str.length);
  },
  
  getEstadoBadge: function(estado) {
    const estados = {
      1: { class: 'bg-warning', text: 'Pendiente' },
      2: { class: 'bg-success', text: 'Pagada' },
      3: { class: 'bg-danger', text: 'Anulada' },
      4: { class: 'bg-info', text: 'En proceso' },
      5: { class: 'bg-secondary', text: 'Rechazada' }
    };
    
    const estadoInfo = estados[estado] || { class: 'bg-secondary', text: 'Desconocido' };
    return `<span class="badge ${estadoInfo.class}">${estadoInfo.text}</span>`;
  },
  
  getEstadoNombre: function(estado) {
    const estados = {
      1: 'Pendiente',
      2: 'Pagada', 
      3: 'Anulada',
      4: 'En proceso',
      5: 'Rechazada'
    };
    
    return estados[estado] || 'Desconocido';
  },
  
  // === HELPERS PARA PRESUPUESTOS ===
  getEstadoPresupuesto: function(estado) {
    const estados = {
      0: 'Borrador',
      1: 'Enviado',
      2: 'Aprobado', 
      3: 'Rechazado',
      4: 'Vencido'
    };
    return estados[estado] || 'Desconocido';
  },

  getEstadoPresupuestoBadge: function(estado) {
    const estados = {
      0: 'bg-secondary',  // Borrador
      1: 'bg-primary',    // Enviado
      2: 'bg-success',    // Aprobado
      3: 'bg-danger',     // Rechazado
      4: 'bg-warning'     // Vencido
    };
    return estados[estado] || 'bg-secondary';
  },

  getImporteFormateado: function(importe) {
    if (!importe || isNaN(importe)) return '$0,00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(importe);
  },

  getDiasVencimiento: function(fecha) {
    if (!fecha) return null;
    const hoy = new Date();
    const fechaVenc = new Date(fecha);
    const diffTime = fechaVenc.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  getVencimientoClass: function(fecha) {
    const dias = this.getDiasVencimiento(fecha);
    if (dias === null) return '';
    if (dias < 0) return 'text-danger';
    if (dias <= 7) return 'text-warning';
    return 'text-success';
  },

  canEditPresupuesto: function(estado) {
    return estado === 0 || estado === 1; // Solo borrador o enviado
  },

  canDeletePresupuesto: function(estado) {
    return estado === 0; // Solo borrador
  },

  sumItems: function(items, campo) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item[campo]) || 0), 0);
  },
  formatDateISO: function(date) {
    if (!date) return '';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  },
  
  capitalize: function(text) {
    if (typeof text !== 'string') return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },
  
  default: function(value, defaultValue) {
    return value || defaultValue;
  },
  
  // Helper para secciones (usado en algunas vistas)
  section: function(name, options) {
    if (!this._sections) this._sections = {};
    this._sections[name] = options.fn(this);
    return null;
  },
  
  // Helper para incluir secciones
  yield: function(name) {
    return this._sections && this._sections[name] ? this._sections[name] : '';
  },
  
  // Helper para obtener el año actual
  currentYear: function() {
    return new Date().getFullYear();
  },
  
  // Helper para formatear números sin decimales
  formatInteger: function(number) {
    if (!number || isNaN(number)) return '0';
    return parseInt(number).toLocaleString('es-AR');
  },
  
  // Helper para generar enlaces de paginación
  paginate: function(currentPage, totalPages, maxButtons = 5) {
    const pages = [];
    const halfMaxButtons = Math.floor(maxButtons / 2);
    let startPage = Math.max(1, currentPage - halfMaxButtons);
    let endPage = Math.min(totalPages, currentPage + halfMaxButtons);
    
    // Ajustar el rango si hay menos páginas al final
    if (endPage - startPage < maxButtons - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxButtons - 1);
      } else {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push({
        page: i,
        current: i === currentPage,
        url: `?page=${i}`
      });
    }
    
    return {
      pages: pages,
      showPrevious: currentPage > 1,
      showNext: currentPage < totalPages,
      previousPage: Math.max(1, currentPage - 1),
      nextPage: Math.min(totalPages, currentPage + 1)
    };
  },
  
  // Helper para mostrar estado de presupuesto con ícono
  estadoPresupuestoIcon: function(estado) {
    const estados = {
      0: { icon: 'fas fa-edit', class: 'text-secondary', name: 'Borrador' },
      1: { icon: 'fas fa-paper-plane', class: 'text-primary', name: 'Enviado' },
      2: { icon: 'fas fa-check-circle', class: 'text-success', name: 'Aprobado' },
      3: { icon: 'fas fa-times-circle', class: 'text-danger', name: 'Rechazado' },
      4: { icon: 'fas fa-clock', class: 'text-warning', name: 'Vencido' }
    };
    
    const estadoInfo = estados[estado] || estados[0];
    return `<i class="${estadoInfo.icon} ${estadoInfo.class}" title="${estadoInfo.name}"></i>`;
  },
  
  // Helper para obtener días hasta fecha
  diasHasta: function(fecha) {
    if (!fecha) return null;
    const hoy = new Date();
    const fechaObj = new Date(fecha);
    const diffTime = fechaObj.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },
  
  // Helper para verificar si una fecha está próxima a vencer (dentro de X días)
  proximoVencimiento: function(fecha, diasAlerta = 7) {
    const dias = this.diasHasta(fecha);
    return dias !== null && dias >= 0 && dias <= diasAlerta;
  },
  
  // Helper para obtener el nombre del mes
  nombreMes: function(fecha) {
    if (!fecha) return '';
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return '';
    
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return meses[fechaObj.getMonth()];
  },
  
  // === ADDITIONAL HELPERS ===
  ifEquals: function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  },
  
  ifNotEquals: function(arg1, arg2, options) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
  },
  
  ifGreaterThan: function(arg1, arg2, options) {
    return (parseFloat(arg1) > parseFloat(arg2)) ? options.fn(this) : options.inverse(this);
  },
  
  ifLessThan: function(arg1, arg2, options) {
    return (parseFloat(arg1) < parseFloat(arg2)) ? options.fn(this) : options.inverse(this);
  },
  
  select: function(value, options) {
    return options.fn(this).replace(
      new RegExp(' value="' + value + '"'),
      '$& selected="selected"'
    );
  },
  
  checkedIf: function(condition, options) {
    return condition ? 'checked="checked"' : '';
  },
  
  selectedIf: function(condition, options) {
    return condition ? 'selected="selected"' : '';
  },
  
  disabledIf: function(condition, options) {
    return condition ? 'disabled="disabled"' : '';
  },
  
  // Helper section para manejo de secciones de contenido
  section: function(name, options) {
    if (!this._sections) this._sections = {};
    this._sections[name] = options.fn(this);
    return null;
  },
  
  // === HELPERS FALTANTES IMPORTANTES ===
  
  // Helper typeOf - determina el tipo de una variable
  typeOf: function(obj) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (Array.isArray(obj)) return 'array';
    return typeof obj;
  }
};
