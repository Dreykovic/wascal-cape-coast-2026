#!/usr/bin/env bash
set -euo pipefail

APP=/var/www/wascal
PORT=3300
DOMAIN=wascal.birewa.com

echo "=== 1. Node 22 -> /opt (www-data ne peut pas traverser /root/.nvm) ==="
if [ ! -x /opt/node22/bin/node ]; then
  SRC=$(ls -d /root/.nvm/versions/node/v22*/ 2>/dev/null | head -1)
  [ -n "${SRC:-}" ] || { echo "ERREUR: Node 22 introuvable dans nvm"; exit 1; }
  cp -r "${SRC%/}" /opt/node22
  chmod -R a+rX /opt/node22
fi
export PATH=/opt/node22/bin:$PATH
echo "node $(node --version) / npm $(npm --version)"

echo "=== 2. Dépendances (pur JS) ==="
cd "$APP"
npm install --omit=dev --no-audit --no-fund

echo "=== 3. .env (secrets générés une seule fois) ==="
mkdir -p "$APP/data"
if [ ! -f "$APP/.env" ]; then
  ADMINPW=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)
  COOKIE=$(openssl rand -hex 32)
  cat > "$APP/.env" <<EOF
PORT=$PORT
HOST=127.0.0.1
NODE_ENV=production
ADMIN_PASSWORD=$ADMINPW
COOKIE_SECRET=$COOKIE
DB_PATH=$APP/data/wascal.db
EOF
fi

echo "=== 4. Permissions (service non-root) ==="
chown -R www-data:www-data "$APP"
chmod 600 "$APP/.env"
chown www-data:www-data "$APP/.env"

echo "=== 5. Service systemd ==="
cat > /etc/systemd/system/wascal.service <<EOF
[Unit]
Description=WASCAL Cape Coast 2026
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP
ExecStart=/opt/node22/bin/node --env-file=$APP/.env $APP/server.js
Restart=always
RestartSec=3
User=www-data
Group=www-data
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable wascal >/dev/null 2>&1 || true
systemctl restart wascal
sleep 2
if ! systemctl is-active --quiet wascal; then
  echo "ERREUR: service inactif"; journalctl -u wascal -n 40 --no-pager; exit 1
fi
echo "service: actif"

echo "=== 6. Vérif locale ==="
curl -s -o /dev/null -w "GET 127.0.0.1:$PORT/ -> HTTP %{http_code}\n" "http://127.0.0.1:$PORT/" || true

echo "=== 7. vhost nginx (n'ajoute QUE ce site) ==="
if [ ! -f "/etc/nginx/sites-available/$DOMAIN" ]; then
  cat > "/etc/nginx/sites-available/$DOMAIN" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name wascal.birewa.com;

    # Upload des photos de galerie (data-URL base64) — au-delà du 1 Mo par défaut
    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:3300;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
fi
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx
echo "nginx: rechargé"

echo "=== TERMINÉ ==="
echo "ADMIN_PASSWORD => $(grep '^ADMIN_PASSWORD=' "$APP/.env" | cut -d= -f2-)"
