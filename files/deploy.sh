#!/usr/bin/env bash
# Mise à jour d'un déploiement WASCAL EXISTANT (qui a déjà des données).
# NON DESTRUCTIF : préserve data/ (base SQLite), .env et public/images/ (photos).
# À lancer sur le VPS en root. Idempotent : peut être relancé sans risque.
#
# Variables surchargeables :  APP, REPO_DIR, REPO_URL, BRANCH, DOMAIN, SERVICE, NODE_BIN
set -euo pipefail

APP=${APP:-/var/www/wascal}
REPO_DIR=${REPO_DIR:-/var/www/wascal-repo}
REPO_URL=${REPO_URL:-https://github.com/Dreykovic/wascal-cape-coast-2026.git}
BRANCH=${BRANCH:-main}
DOMAIN=${DOMAIN:-wascal.birewa.com}
SERVICE=${SERVICE:-wascal}
NODE_BIN=${NODE_BIN:-/opt/node22/bin}
export PATH="$NODE_BIN:$PATH"

echo "=== 0. Sauvegarde de la base (sécurité avant tout) ==="
if [ -f "$APP/data/wascal.db" ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  cp -a "$APP/data/wascal.db" "$APP/data/wascal.db.bak-$TS"
  echo "  sauvegarde -> $APP/data/wascal.db.bak-$TS ($(du -h "$APP/data/wascal.db" | cut -f1))"
else
  echo "  (aucune base existante en $APP/data/wascal.db — premier déploiement ?)"
fi

echo "=== 1. Récupération du code (branche $BRANCH) ==="
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi
echo "  commit déployé : $(git -C "$REPO_DIR" rev-parse --short HEAD) — $(git -C "$REPO_DIR" log -1 --format=%s)"

echo "=== 2. Synchro du code vers $APP (préserve data/.env/uploads) ==="
mkdir -p "$APP"
rsync -a --delete \
  --exclude 'data/' \
  --exclude '.env' \
  --exclude 'node_modules/' \
  --exclude 'public/images/' \
  "$REPO_DIR/files/" "$APP/"

echo "=== 3. Dépendances (pur JS, pas de natif) ==="
cd "$APP"
npm install --omit=dev --no-audit --no-fund

echo "=== 4. Dossier des photos + permissions (uploads écrits par le service) ==="
mkdir -p "$APP/public/images" "$APP/data"
chown -R www-data:www-data "$APP"
[ -f "$APP/.env" ] && chmod 600 "$APP/.env" || true

echo "=== 5. nginx : autoriser les uploads de photos (client_max_body_size 12M) ==="
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
if [ -f "$NGINX_CONF" ]; then
  if grep -q "client_max_body_size" "$NGINX_CONF"; then
    echo "  déjà présent dans $NGINX_CONF"
  else
    # Insère après CHAQUE server_name (blocs HTTP 80 ET HTTPS 443 créés par certbot)
    sed -i 's/\(server_name[^;]*;\)/\1\n    client_max_body_size 12M;/' "$NGINX_CONF"
    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      echo "  ajouté + nginx rechargé"
    else
      echo "  !! nginx -t a échoué — vérifier $NGINX_CONF manuellement"
    fi
  fi
else
  echo "  (conf nginx introuvable : $NGINX_CONF — à ajuster si autre domaine)"
fi

echo "=== 6. Redémarrage du service ==="
systemctl restart "$SERVICE"
sleep 2
if ! systemctl is-active --quiet "$SERVICE"; then
  echo "ERREUR: service inactif après redémarrage"
  journalctl -u "$SERVICE" -n 40 --no-pager
  exit 1
fi
echo "  service actif"

echo "=== 7. Vérifications ==="
PORT=$(grep -oP '^PORT=\K.*' "$APP/.env" 2>/dev/null || echo 3300)
curl -s -o /dev/null -w "  GET /            -> HTTP %{http_code}\n" "http://127.0.0.1:$PORT/" || true
ALB=$(curl -s "http://127.0.0.1:$PORT/api/gallery" \
  | grep -o '"title"' | wc -l | tr -d ' ')
echo "  /api/gallery     -> $ALB album(s) (5 attendus au 1er déploiement)"
if command -v sqlite3 >/dev/null 2>&1; then
  RESP=$(sqlite3 "$APP/data/wascal.db" 'SELECT COUNT(*) FROM responses' 2>/dev/null || echo '?')
  echo "  réponses en base -> $RESP (doit correspondre à tes données existantes)"
else
  echo "  (sqlite3 absent — réponses non comptées ; la base est sauvegardée et la table responses est intacte)"
fi
echo ""
echo "=== TERMINÉ ==="
echo "Site : https://$DOMAIN/   ·   Admin : https://$DOMAIN/admin"
echo "En cas de souci, restaurer : cp \$APP/data/wascal.db.bak-<TS> \$APP/data/wascal.db && systemctl restart $SERVICE"
