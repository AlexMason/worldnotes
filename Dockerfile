# syntax=docker/dockerfile:1
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.base.json tsconfig.core.json tsconfig.client.json tsconfig.server.json tsconfig.json vite.client.config.ts ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY src ./src
COPY migrations ./migrations
# Bundled default icon set (served at /icons/*; uploads live in Postgres,
# so no volume is needed).
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
