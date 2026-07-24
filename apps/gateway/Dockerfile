FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace apps/gateway

EXPOSE 23800

CMD ["npm", "run", "start", "--workspace", "apps/gateway"]
