FROM node:22-alpine

WORKDIR /app

ENV ND8_HOME=/app/.nd8

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 23801

CMD ["npx", "ts-node", "src/core/server.ts"]
