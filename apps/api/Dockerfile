FROM node:22-alpine

WORKDIR /app

ENV FABRIC_HOME=/app/.fabric

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json

RUN npm ci

COPY . .

EXPOSE 23801

CMD ["npm", "run", "dev", "--workspace", "apps/api"]
