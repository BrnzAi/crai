FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]
