#!/bin/bash
# Deploy Script para SGI - Producción 23.105.176.45:3456

set -e

SERVER="23.105.176.45"
USER="root"
APP_DIR="/home/sgi.ultimamilla.com.ar"
BACKUP_DIR="/home/backups/sgi"

echo "🚀 Iniciando deploy a $SERVER..."

# Backup
ssh $USER@$SERVER "mkdir -p $BACKUP_DIR/\$(date +%Y%m%d_%H%M%S)"

# Sync
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  ./ $USER@$SERVER:$APP_DIR/

# Deploy
ssh $USER@$SERVER << 'ENDSSH'
cd /home/sgi.ultimamilla.com.ar
npm install --production
pm2 restart sgi
sleep 5
pm2 status sgi
curl -I http://localhost:3456/ || echo "Verificar manualmente"
ENDSSH

echo "✅ Deploy completado"
