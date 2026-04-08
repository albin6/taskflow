# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production environment
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled output from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Ensure the unprivileged non-root 'node' user owns the files
RUN chown -R node:node /usr/src/app

# Switch to the non-root user
USER node

# Expose the application port
EXPOSE 9001

# Start the application
CMD ["node", "dist/main"]
