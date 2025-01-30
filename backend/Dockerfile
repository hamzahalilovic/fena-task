FROM node:20

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

ARG ENV_FILE=./backend/.env.local
ENV ENV_FILE=$ENV_FILE

EXPOSE 3000

CMD ["yarn", "start"]