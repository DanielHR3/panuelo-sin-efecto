# Imagen de la API NestJS. Al arrancar aplica las migraciones pendientes
# (`prisma migrate deploy`) y levanta el servidor compilado.
#
#   docker build -t panuelo-api ./backend
#   docker run -p 3000:3000 --env-file backend/.env panuelo-api

FROM node:20-alpine AS build
WORKDIR /app
# Prisma necesita OpenSSL para sus motores nativos en Alpine.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
