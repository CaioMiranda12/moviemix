FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api/tsconfig*.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build --workspace @moviemix/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 3333
CMD ["node", "apps/api/dist/server.js"]
