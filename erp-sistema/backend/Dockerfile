# ---- Build stage ----
# CORREÇÃO: Atualizado para node:20-alpine para suporte nativo ao crypto global
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production stage ----
# CORREÇÃO: Atualizado para node:20-alpine
FROM node:20-alpine AS production
WORKDIR /app

# Criar grupo e usuário antes de copiar os arquivos
RUN addgroup -S erp && adduser -S erp -G erp

COPY package*.json ./
RUN npm ci --omit=dev

# Copia os arquivos gerados com a permissão correta
COPY --from=builder --chown=erp:erp /app/dist ./dist

# Garante a propriedade de todo o diretório de execução
RUN chown -R erp:erp /app

USER erp
ENV PORT=3002
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3002/api/health || exit 1

# Direcionado para a pasta correta encontrada no passo anterior
CMD ["node", "dist/src/main.js"]