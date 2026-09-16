# Etapa 1: gera a versão para baixar da Oficina (arquivo único, roda offline)
FROM node:20-alpine AS empacotador

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY public ./public
COPY tools ./tools
# O app do Windows precisa baixar os binários do Neutralino; se não der, o site
# fica só com a versão em arquivo único
RUN npm run empacotar && (npm run empacotar:exe || echo "sem app do Windows nesta build")

# Etapa 2: o servidor
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# O site serve só um arquivo do Phaser (/vendor/phaser); o resto do pacote
# (código-fonte e outras versões, ~115 MB) não vai para a imagem
RUN npm install --omit=dev \
  && find node_modules/phaser -mindepth 1 -maxdepth 1 ! -name dist ! -name package.json -exec rm -rf {} + \
  && find node_modules/phaser/dist -type f ! -name 'phaser.esm.min.js' -delete

COPY server.js ./
COPY src ./src
COPY public ./public
COPY --from=empacotador /app/public/downloads ./public/downloads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
