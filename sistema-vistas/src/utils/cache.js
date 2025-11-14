/**
 * Sistema de cache simple para estadísticas
 * Evita queries repetitivas al dashboard
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
  }

  /**
   * Generar clave de cache
   */
  generateKey(key, params = {}) {
    const paramStr = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `${key}:${paramStr}`;
  }

  /**
   * Obtener valor del cache
   */
  get(key, params = {}) {
    const fullKey = this.generateKey(key, params);
    const item = this.cache.get(fullKey);
    
    if (!item) return null;
    
    // Verificar si ha expirado
    if (Date.now() > item.expiry) {
      this.cache.delete(fullKey);
      return null;
    }
    
    return item.data;
  }

  /**
   * Guardar valor en cache
   */
  set(key, data, ttl = null, params = {}) {
    const fullKey = this.generateKey(key, params);
    const expiry = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(fullKey, {
      data,
      expiry,
      created: Date.now()
    });
    
    return data;
  }

  /**
   * Eliminar entrada del cache
   */
  delete(key, params = {}) {
    const fullKey = this.generateKey(key, params);
    return this.cache.delete(fullKey);
  }

  /**
   * Limpiar todo el cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    return {
      total: entries.length,
      active: entries.filter(([key, item]) => now <= item.expiry).length,
      expired: entries.filter(([key, item]) => now > item.expiry).length,
      memory: JSON.stringify(Array.from(this.cache)).length
    };
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanExpired() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        this.cache.delete(key);
        expired.push(key);
      }
    }
    
    return expired.length;
  }

  /**
   * Wrapper para funciones con cache automático
   */
  async cachedCall(key, fn, ttl = null, params = {}) {
    // Intentar obtener del cache
    const cached = this.get(key, params);
    if (cached !== null) {
      return cached;
    }
    
    try {
      // Ejecutar función y cachear resultado
      const result = await fn();
      return this.set(key, result, ttl, params);
    } catch (error) {
      // No cachear errores, dejar que se propague
      throw error;
    }
  }
}

// Instancia global del cache
const globalCache = new SimpleCache();

// Limpiar cache expirado cada 10 minutos (excepto en entorno de pruebas)
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutos
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const cleaned = globalCache.cleanExpired();
    if (process.env.NODE_ENV === 'development' && cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} expired entries removed`);
    }
  }, CLEANUP_INTERVAL);
}

module.exports = {
  cache: globalCache,
  SimpleCache
};
