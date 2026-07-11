FROM node:22-alpine

WORKDIR /app

ENV FABRIC_HOME=/app/.fabric

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 23801

CMD ["npx", "ts-node", "src/core/server.ts"]
