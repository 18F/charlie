FROM node:14

RUN mkdir /app
WORKDIR /app

ADD ./package.json .
ADD ./package-lock.json .

RUN npm ci

CMD npm run start-dev
