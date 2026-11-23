FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --no-audit --no-fund
COPY client/ ./client/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000 DB_PATH=/app/server/data/asteria.sqlite
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --omit=dev --no-audit --no-fund
COPY server/ ./server/
COPY --from=build /app/client/dist/ ./client/dist/
RUN mkdir -p /app/server/data /app/server/uploads/public /app/server/uploads/private
EXPOSE 4000
CMD ["node", "server/index.js"]
