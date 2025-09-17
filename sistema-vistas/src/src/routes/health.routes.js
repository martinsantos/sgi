const express = require('express');
const router = express.Router();
const os = require('os');

router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  
  // Calcular uso de CPU
  const cpuUsage = Math.round(
    (cpu.user + cpu.system) / ((os.cpus().length * 1000000) * uptime) * 100
  );

  // Metricas de sistema
  const systemMetrics = {
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round(uptime),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
      unit: 'MB'
    },
    cpu: {
      usage: cpuUsage,
      cores: os.cpus().length
    },
    load: os.loadavg()
  };

  // Verificar umbrales críticos
  const isCritical = 
    cpuUsage > 90 || 
    (memory.heapUsed / memory.heapTotal) > 0.9 ||
    os.loadavg()[0] > os.cpus().length * 2;

  if (isCritical) {
    systemMetrics.status = 'warning';
    systemMetrics.warnings = [];
    
    if (cpuUsage > 90) {
      systemMetrics.warnings.push('Alto uso de CPU');
    }
    if ((memory.heapUsed / memory.heapTotal) > 0.9) {
      systemMetrics.warnings.push('Alto uso de memoria');
    }
    if (os.loadavg()[0] > os.cpus().length * 2) {
      systemMetrics.warnings.push('Alta carga del sistema');
    }
  }

  res.json(systemMetrics);
});

router.get('/db', async (req, res) => {
  const pool = require('../config/database');
  
  try {
    const startTime = process.hrtime();
    
    // Prueba simple de DB
    await pool.query('SELECT 1');
    
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // Convertir a ms
    
    res.json({
      status: 'ok',
      database: {
        connected: true,
        responseTime: `${responseTime.toFixed(2)}ms`
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

router.get('/full', async (req, res) => {
  const pool = require('../config/database');
  const diskspace = require('diskspace');
  
  try {
    // DB check
    const dbStartTime = process.hrtime();
    await pool.query('SELECT 1');
    const dbDiff = process.hrtime(dbStartTime);
    const dbResponseTime = (dbDiff[0] * 1e9 + dbDiff[1]) / 1e6;

    // Disk space check
    const root = process.platform === 'win32' ? 'c:' : '/';
    const disk = await new Promise((resolve, reject) => {
      diskspace.check(root, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Memory check
    const memory = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // CPU check
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      process: {
        pid: process.pid,
        version: process.version,
        memory: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024),
          unit: 'MB'
        }
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        release: os.release(),
        memory: {
          total: Math.round(systemMemory.total / 1024 / 1024),
          used: Math.round(systemMemory.used / 1024 / 1024),
          free: Math.round(systemMemory.free / 1024 / 1024),
          unit: 'MB'
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0].model,
          speed: cpus[0].speed,
          loadAvg: loadAvg
        },
        disk: {
          total: Math.round(disk.total / 1024 / 1024),
          used: Math.round(disk.used / 1024 / 1024),
          free: Math.round(disk.free / 1024 / 1024),
          unit: 'MB'
        }
      },
      services: {
        database: {
          connected: true,
          responseTime: `${dbResponseTime.toFixed(2)}ms`
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: {
        message: 'Error checking system health',
        details: error.message
      }
    });
  }
});

module.exports = router;
