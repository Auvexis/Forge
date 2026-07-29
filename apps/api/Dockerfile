FROM node:22-alpine AS deps

WORKDIR /app

ENV FABRIC_HOME=/app/.fabric

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN npm ci --include-workspace-root --workspace apps/api --workspace apps/client --workspace apps/gateway

FROM deps AS build

WORKDIR /app

COPY . .

RUN npm run build --workspace apps/api

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV FABRIC_HOME=/app/.fabric

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/desktop/package.json apps/desktop/package.json

RUN npm ci --omit=dev --include-workspace-root --workspace apps/api --workspace apps/client --workspace apps/gateway

COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 23801

CMD ["npm", "run", "start", "--workspace", "apps/api"]
