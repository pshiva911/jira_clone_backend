FROM node:14-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npx prisma generate

ENV PORT 80

EXPOSE 80

CMD ["node" , "server"]
