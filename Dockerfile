# ---- Base ----
FROM node:22-alpine AS base

# Install necessary build tools for node-gyp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

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