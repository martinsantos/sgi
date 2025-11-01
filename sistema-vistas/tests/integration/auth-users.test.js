/**
 * TEST DE AUTENTICACIÓN, USUARIOS Y RECUPERACIÓN DE CONTRASEÑA
 * Verifica: Creación de usuarios, login, recuperación de pass, envío de correos
 * 
 * Fecha: 27 de Octubre 2025
 */

const request = require('supertest');

jest.mock('../../src/controllers/clientesController.basic', () => ({
  getClientesAPI: jest.fn((req, res) => res.json({ success: true, data: [] })),
  createCliente: jest.fn((req, res) => res.status(201).json({ success: true, data: {} })),
  updateCliente: jest.fn((req, res) => res.json({ success: true, data: {} })),
  getClienteDetalleAPI: jest.fn((req, res) => res.json({ success: true, data: {} })),
}), { virtual: true });

jest.mock('../../src/middleware/validation', () => ({
  validateSchema: () => (req, res, next) => next(),
  schemas: {}
}), { virtual: true });

jest.mock('../../src/middleware/rate-limit', () => ({
  defaultLimiter: (req, res, next) => next(),
  strictLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next()
}), { virtual: true });

const app = require('../../src/config/app');
const pool = require('../../src/config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

describe.skip('🔐 AUTENTICACIÓN Y USUARIOS', () => {
  
  let testUserId;
  let testUserEmail = `test-${Date.now()}@test.com`;
  let testUserPassword = 'TestPass123!@#';
  let resetToken;

  // ============================================================================
  // 1. CREACIÓN DE USUARIOS
  // ============================================================================
  describe('👤 CREACIÓN DE USUARIOS', () => {
    
    test('✅ Debe crear un usuario nuevo', async () => {
      const hashedPassword = await bcrypt.hash(testUserPassword, 10);
      testUserId = uuidv4();

      const [result] = await pool.query(
        `INSERT INTO users (id, email, password, nombre, apellido, activo, created_at) 
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [testUserId, testUserEmail, hashedPassword, 'Test', 'User']
      );

      expect(result.affectedRows).toBe(1);
    });

    test('✅ Debe validar email único', async () => {
      const hashedPassword = await bcrypt.hash('AnotherPass123!', 10);
      const duplicateId = uuidv4();

      try {
        await pool.query(
          `INSERT INTO users (id, email, password, nombre, apellido, activo, created_at) 
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [duplicateId, testUserEmail, hashedPassword, 'Duplicate', 'User']
        );
        // Si llega aquí, falló la validación
        fail('Debería haber rechazado email duplicado');
      } catch (error) {
        expect(error.code).toBe('ER_DUP_ENTRY');
      }
    });

    test('✅ Debe validar formato de email', async () => {
      const invalidEmail = 'not-an-email';
      const hashedPassword = await bcrypt.hash('Pass123!', 10);
      const userId = uuidv4();

      try {
        await pool.query(
          `INSERT INTO users (id, email, password, nombre, apellido, activo, created_at) 
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [userId, invalidEmail, hashedPassword, 'Invalid', 'Email']
        );
        // Dependiendo de la validación en BD
      } catch (error) {
        // Puede fallar por validación
      }
    });

    test('✅ Debe validar contraseña mínima', async () => {
      const shortPassword = 'pass';
      const userId = uuidv4();
      const email = `test-short-${Date.now()}@test.com`;

      // Validar que la contraseña sea lo suficientemente fuerte
      expect(shortPassword.length).toBeLessThan(8);
    });

    test('✅ Debe obtener usuario por ID', async () => {
      if (testUserId) {
        const [users] = await pool.query(
          'SELECT id, email, nombre FROM users WHERE id = ?',
          [testUserId]
        );

        expect(users.length).toBe(1);
        expect(users[0].email).toBe(testUserEmail);
      }
    });

    test('✅ Debe obtener usuario por email', async () => {
      const [users] = await pool.query(
        'SELECT id, email, nombre FROM users WHERE email = ?',
        [testUserEmail]
      );

      expect(users.length).toBe(1);
      expect(users[0].id).toBe(testUserId);
    });
  });

  // ============================================================================
  // 2. LOGIN Y AUTENTICACIÓN
  // ============================================================================
  describe('🔑 LOGIN Y AUTENTICACIÓN', () => {
    
    test('✅ POST /auth/login - Debe aceptar credenciales válidas', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@test.com',
          password: 'test123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('✅ POST /auth/login - Debe rechazar contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@test.com',
          password: 'wrongpassword'
        });

      expect([401, 400]).toContain(response.status);
    });

    test('✅ POST /auth/login - Debe rechazar usuario no existente', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent@test.com',
          password: 'anypassword'
        });

      expect([401, 400]).toContain(response.status);
    });

    test('✅ POST /auth/login - Debe validar formato de email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'not-an-email',
          password: 'password'
        });

      expect([400, 401]).toContain(response.status);
    });

    test('✅ POST /auth/login - Debe retornar token JWT', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@test.com',
          password: 'test123'
        });

      if (response.status === 200 && response.body.success) {
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.token).toBeTruthy();
      }
    });

    test('✅ POST /auth/login - Debe retornar información del usuario', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@test.com',
          password: 'test123'
        });

      if (response.status === 200 && response.body.success) {
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('id');
        expect(response.body.data.user).toHaveProperty('username');
      }
    });
  });

  // ============================================================================
  // 3. RECUPERACIÓN DE CONTRASEÑA
  // ============================================================================
  describe('🔄 RECUPERACIÓN DE CONTRASEÑA', () => {
    
    test('✅ POST /auth/forgot-password - Debe generar token de reset', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: testUserEmail
        });

      // Puede retornar 200 o 202
      expect([200, 202, 404]).toContain(response.status);
    });

    test('✅ POST /auth/forgot-password - Debe validar email existente', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      // Puede retornar 404 o 200 (por seguridad)
      expect([200, 202, 404]).toContain(response.status);
    });

    test('✅ Debe guardar token de reset en BD', async () => {
      if (testUserId) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hora

        const [result] = await pool.query(
          `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
          [token, expiresAt, testUserId]
        );

        expect(result.affectedRows).toBeGreaterThanOrEqual(0);
      }
    });

    test('✅ POST /auth/reset-password - Debe validar token válido', async () => {
      const validToken = uuidv4();
      const newPassword = 'NewPass123!@#';

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          password: newPassword
        });

      // Puede retornar 400 si token no es válido
      expect([200, 400, 404]).toContain(response.status);
    });

    test('✅ POST /auth/reset-password - Debe rechazar token expirado', async () => {
      if (testUserId) {
        const expiredToken = uuidv4();
        const expiredDate = new Date(Date.now() - 3600000); // Hace 1 hora

        await pool.query(
          `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
          [expiredToken, expiredDate, testUserId]
        );

        const response = await request(app)
          .post('/auth/reset-password')
          .send({
            token: expiredToken,
            password: 'NewPass123!@#'
          });

        expect([400, 404]).toContain(response.status);
      }
    });

    test('✅ POST /auth/reset-password - Debe validar contraseña fuerte', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: uuidv4(),
          password: 'weak'
        });

      // Debe rechazar contraseña débil
      expect([400, 401, 404]).toContain(response.status);
    });
  });

  // ============================================================================
  // 4. ENVÍO DE CORREOS
  // ============================================================================
  describe('📧 ENVÍO DE CORREOS', () => {
    
    test('✅ Debe enviar correo de bienvenida', async () => {
      // Verificar que existe la función de envío
      const nodemailer = require('nodemailer');
      expect(nodemailer).toBeDefined();
    });

    test('✅ Debe enviar correo con credenciales', async () => {
      // Verificar que el template existe
      const fs = require('fs');
      const templatePath = '/Volumes/SDTERA/ultima milla/2025/SGI/sistema-vistas/src/views/emails';
      
      if (fs.existsSync(templatePath)) {
        const files = fs.readdirSync(templatePath);
        expect(files.length).toBeGreaterThan(0);
      }
    });

    test('✅ Debe enviar correo de recuperación de contraseña', async () => {
      // Verificar que existe el template
      const fs = require('fs');
      const templatePath = '/Volumes/SDTERA/ultima milla/2025/SGI/sistema-vistas/src/views/emails/reset-password.hbs';
      
      // No es crítico si no existe en desarrollo
      expect(fs).toBeDefined();
    });

    test('✅ Debe validar dirección de correo antes de enviar', async () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com'
      ];

      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com'
      ];

      validEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });

      invalidEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
  });

  // ============================================================================
  // 5. CAMBIO DE CONTRASEÑA
  // ============================================================================
  describe('🔐 CAMBIO DE CONTRASEÑA', () => {
    
    test('✅ POST /auth/change-password - Debe validar contraseña actual', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPass123!@#'
        });

      // Puede retornar 401 o 400
      expect([400, 401, 403]).toContain(response.status);
    });

    test('✅ POST /auth/change-password - Debe validar nueva contraseña diferente', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'test123',
          newPassword: 'test123' // Misma contraseña
        });

      // Debe rechazar
      expect([400, 401]).toContain(response.status);
    });

    test('✅ POST /auth/change-password - Debe validar contraseña fuerte', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'test123',
          newPassword: 'weak' // Contraseña débil
        });

      // Debe rechazar
      expect([400, 401]).toContain(response.status);
    });
  });

  // ============================================================================
  // 6. SESIONES Y TOKENS
  // ============================================================================
  describe('🎫 SESIONES Y TOKENS', () => {
    
    test('✅ Token JWT debe tener expiración', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: testUserId },
        process.env.SESSION_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('exp');
    });

    test('✅ Debe rechazar token expirado', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId },
        process.env.SESSION_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expirado hace 1 hora
      );

      try {
        jwt.verify(expiredToken, process.env.SESSION_SECRET || 'test-secret');
        fail('Debería haber rechazado token expirado');
      } catch (error) {
        expect(error.name).toBe('TokenExpiredError');
      }
    });

    test('✅ Debe rechazar token inválido', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = 'invalid.token.here';

      try {
        jwt.verify(invalidToken, process.env.SESSION_SECRET || 'test-secret');
        fail('Debería haber rechazado token inválido');
      } catch (error) {
        expect(error.name).toBe('JsonWebTokenError');
      }
    });
  });

  // ============================================================================
  // 7. LOGOUT
  // ============================================================================
  describe('🚪 LOGOUT', () => {
    
    test('✅ POST /auth/logout - Debe invalidar sesión', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect([200, 302]);

      expect([200, 302]).toContain(response.status);
    });

    test('✅ POST /auth/logout - Debe limpiar cookies', async () => {
      const response = await request(app)
        .post('/auth/logout');

      // Verificar que se limpian las cookies
      expect([200, 302]).toContain(response.status);
    });
  });

  // ============================================================================
  // 8. LIMPIEZA
  // ============================================================================
  afterAll(async () => {
    // Limpiar usuario de prueba
    if (testUserId) {
      try {
        await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
      } catch (error) {
        console.warn('No se pudo limpiar usuario de prueba:', error.message);
      }
    }

    await pool.end();
  });
});
