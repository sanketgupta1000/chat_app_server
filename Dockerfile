# node as a base
FROM node:22.15.0 AS base
# set the working directory
WORKDIR /chat_app_server

# development build stage
# will install dev dependencies too, such as nodemon (included in package.json)
# also keep in mind to utilize the build cache properly
FROM base AS dev
COPY ./package.json .
# installs dev dependencies too
RUN npm install
COPY . .
CMD [ "npm", "start" ]

# production build stage
FROM base AS final
COPY ./package.json .
# build for production, do not install dev dependencies
RUN npm install --production
COPY . .
CMD [ "node", "app.js" ]