# Estágio de build do React (Vite)
FROM node:alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de produção servindo os estáticos
FROM nginx:alpine
# Copia a build do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html
# Sobrescreve a configuração padrão do NGINX
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
