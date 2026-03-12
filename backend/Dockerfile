FROM node:alpine
WORKDIR /app

# Instalar pacotes de LaTeX necessários no Alpine
RUN apk update && apk add --no-cache \
    texlive \
    texlive-luatex \
    texlive-xetex \
    texmf-dist \
    tzdata \
    fontconfig \
    mkfontscale \
    curl \
    && rm -rf /var/cache/apk/*

COPY package*.json ./
RUN npm install --production

COPY . .

# Expor porta 3001
EXPOSE 3001

# Comando de inicialização de produção conforme solicitado
CMD ["npm", "start"]
