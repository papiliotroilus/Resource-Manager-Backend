FROM node:lts-alpine
WORKDIR /backend
COPY . .
RUN npm install
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
EXPOSE 3000