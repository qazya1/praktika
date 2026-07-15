FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json vite.config.ts ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
