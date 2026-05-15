FROM node:22-alpine

WORKDIR /app

ARG VITE_API_URL=http://localhost:23801
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 23802

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "23802"]
