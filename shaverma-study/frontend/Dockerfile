FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
