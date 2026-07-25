FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:23801
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY apps/gateway/package.json apps/gateway/package.json

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build --workspace apps/client

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
