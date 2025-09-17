const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for SGI system
 * Supports both session-based and JWT authentication
 * Uses existing users and roles tables from database
 */
class AuthMiddleware {
    
    /**
     * Check if user is authenticated
     */
    static requireAuth(req, res, next) {
        // Check JWT token for API requests
        if (req.path.startsWith('/api/')) {
            const authHeader = req.headers.authorization;
            
            // Allow test token
            if (process.env.NODE_ENV === 'test' && authHeader === 'Bearer test-token') {
                req.user = { id: 'test-user' };
                return next();
            }
            
            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'No se ha proporcionado token de autenticación'
                    }
                });
            }
            
            try {
                const token = authHeader.split(' ')[1];
                const decodedToken = jwt.verify(token, process.env.SESSION_SECRET);
                req.user = { id: decodedToken.userId };
                return next();
            } catch (error) {
                if (error instanceof jwt.TokenExpiredError) {
                    return res.status(401).json({
                        success: false,
                        error: {
                            message: 'Token expirado'
                        }
                    });
                }
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Token inválido'
                    }
                });
            }
        }

        // Check session for web requests
        if (req.session && req.session.userId) {
            return next();
        }
        
        // Store original URL to redirect after login
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    }
    
    /**
     * Check if user has specific role
     */
    static requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.session || !req.session.userId) {
                req.session.returnTo = req.originalUrl;
                return res.redirect('/login');
            }
            
            const userRole = req.session.userRole;
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).render('error', {
                    title: 'Acceso Denegado',
                    message: 'No tienes permisos para acceder a esta sección',
                    error: { status: 403 }
                });
            }
            
            next();
        };
    }
    
    /**
     * Check if user is admin
     */
    static requireAdmin(req, res, next) {
        return AuthMiddleware.requireRole(['Administrador'])(req, res, next);
    }
    
    /**
     * Verify SHA1 password (legacy system compatibility)
     */
    static verifySHA1Password(inputPassword, storedHash) {
        const hash = crypto.createHash('sha1');
        hash.update(inputPassword);
        return hash.digest('hex') === storedHash;
    }
    
    /**
     * Hash password with bcrypt (for new passwords)
     */
    static async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }
    
    /**
     * Verify bcrypt password
     */
    static async verifyBcryptPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
    
    /**
     * Add user info to all templates
     */
    static addUserToLocals(req, res, next) {
        if (req.session && req.session.userId) {
            res.locals.user = {
                id: req.session.userId,
                username: req.session.username,
                role: req.session.userRole,
                isAuthenticated: true,
                isAdmin: req.session.userRole === 'Administrador'
            };
        } else {
            res.locals.user = {
                isAuthenticated: false,
                isAdmin: false
            };
        }
        next();
    }
    
    /**
     * Skip authentication for development (optional)
     */
    static skipAuthForDev(req, res, next) {
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
            // Mock user for development
            req.session.userId = 'dev-user';
            req.session.username = 'developer';
            req.session.userRole = 'Administrador';
        }
        next();
    }
}

module.exports = AuthMiddleware;
