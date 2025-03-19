FROM node:18-alpine AS builder

# RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine AS server

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV HOST 0.0.0.0
ENV PORT 3000

EXPOSE 3000

# CMD ["serve", "-s", "dist", "-l", "0.0.0.0:3000"]
CMD ["serve", "-s", "dist", "-l", "3000"]