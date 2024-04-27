# syntax=docker/dockerfile:1

FROM node:18-alpine
# ENV NODE_ENV=production

WORKDIR /techstore/backend

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install
RUN npm install -g @babel/core @babel/cli

COPY . .

RUN npm run build

CMD ["npm", "start"]