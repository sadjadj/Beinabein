# Build context = repo root (monorepo). Builds client/ and dashboard/ as
# static bundles, bakes them into the api/ image alongside its own server —
# one container, matching the kenar-care pattern this whole deploy is modeled on.

FROM node:lts-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:lts-alpine AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM node:lts-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY api/ ./
COPY --from=client-build /app/client/dist ./public
COPY --from=dashboard-build /app/dashboard/dist ./public/dashboard
EXPOSE 3000
CMD ["node", "server.js"]
