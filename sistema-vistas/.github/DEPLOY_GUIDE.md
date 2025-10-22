# 🚀 Guía de Deploy SGI

## Servidor Producción
- IP: 23.105.176.45
- Puerto: 3456
- PM2: sgi
- URL: https://sgi.ultimamilla.com.ar

## Deploy Manual
```bash
# Conectar
ssh root@23.105.176.45

# Backup
cd /home/sgi.ultimamilla.com.ar
mkdir -p /home/backups/sgi/$(date +%Y%m%d_%H%M%S)

# Sync archivos
rsync -avz --exclude node_modules ./ root@23.105.176.45:/home/sgi.ultimamilla.com.ar/

# Reiniciar
npm install --production
pm2 restart sgi
pm2 logs sgi --lines 50
```

## GitHub Actions
- Push a main = Auto-deploy
- Tests deben pasar
- Backup automático
- Rollback si falla
