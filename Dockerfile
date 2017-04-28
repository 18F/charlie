FROM node:6

RUN mkdir /app
WORKDIR /app

ADD ./package.json .
RUN npm install

CMD ./start.sh
