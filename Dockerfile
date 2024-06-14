# ---- Base ----
FROM node:22-alpine AS base

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies

# Install npm dependencies, including node-gyp
RUN npm ci

# Copy all source files
COPY . .

# ---- Production ----
FROM dependencies AS production

# Default command to start the application
CMD ["npm", "start"]