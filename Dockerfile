FROM node:8

RUN mkdir /app
WORKDIR /app

ADD ./package.json .
RUN npm install

CMD ./start.sh
