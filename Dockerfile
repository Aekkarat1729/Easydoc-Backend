# Use official Node.js runtime as base image (Node 20 for Firebase compatibility)
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Copy prisma schema first
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["npm", "start"]
