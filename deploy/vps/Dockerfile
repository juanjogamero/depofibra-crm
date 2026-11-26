# SOLO preview: no instalar este artefacto como aplicación con datos reales.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
ARG VITE_BASE_PATH=/
ARG VITE_APP_MODE=vps-preview
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_APP_MODE=${VITE_APP_MODE}
# Bloqueo preventivo: el Dockerfile no produce una versión etiquetada production.
RUN test "$VITE_APP_MODE" = 'vps-preview' && test "$VITE_BASE_PATH" = '/' \
    && npm run test:unit && npm run build

FROM nginx:1.28-alpine
COPY deploy/vps/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
