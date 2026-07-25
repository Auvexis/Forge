FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json

RUN npm ci

FROM deps AS build

WORKDIR /app

COPY . .

RUN npm run build --workspace apps/gateway

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json

RUN npm ci --omit=dev

COPY --from=build /app/apps/gateway/dist apps/gateway/dist

EXPOSE 23800

CMD ["npm", "run", "start", "--workspace", "apps/gateway"]
