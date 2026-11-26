# Imagem de produção: compila o site e roda o servidor Node.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
COPY --from=build /app /app
# O banco de dados fica em /data: monte um volume persistente nesse caminho.
VOLUME ["/data"]
EXPOSE 3000
# SIGTERM no deploy: o servidor devolve os valores das partidas em andamento antes de desligar.
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
