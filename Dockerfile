FROM node:14.20.1 as build-stage


ENV NODE_OPTIONS=--max-old-space-size=8192
WORKDIR /app
COPY ./package.json ./
RUN yarn install
COPY . ./
RUN yarn build --max_old_space_size=8192

FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/build /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
