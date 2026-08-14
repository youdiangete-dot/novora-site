FROM node:24-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts --no-audit --no-fund --package-lock=false

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node --from=build /app/dist ./dist

USER node
EXPOSE 8080

CMD ["npm", "start"]
