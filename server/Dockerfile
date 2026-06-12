FROM node:22-alpine

WORKDIR /app

ENV SAILOR_HOME=/app/.sailor

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 23801

CMD ["npx", "ts-node", "src/core/server.ts"]
