FROM node:14-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 80

CMD ["node" , "server"]
