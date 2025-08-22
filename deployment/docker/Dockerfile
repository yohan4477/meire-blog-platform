# Dockerfile for Meire Blog Automated Crawler
# 
# This Docker image runs the automated crawling system in a containerized environment
# with proper timezone handling, logging, and resource management.
# 
# Build: docker build -t meire-crawler -f deployment/docker/Dockerfile .
# Run: docker run -d --name meire-crawler --restart unless-stopped meire-crawler
# 
# Environment Variables:
#   - ANTHROPIC_API_KEY: Required for sentiment analysis
#   - NOTIFICATION_WEBHOOK_URL: Optional webhook for notifications
#   - TZ: Timezone (default: Asia/Seoul)
#   - LOG_LEVEL: Logging level (default: info)

FROM node:20-alpine

# Set timezone
ENV TZ=Asia/Seoul
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    bash \
    ca-certificates

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=nextjs:nodejs . .

# Create necessary directories
RUN mkdir -p logs && \
    chown nextjs:nodejs logs && \
    chmod 755 logs

# Create database directory
RUN mkdir -p data && \
    chown nextjs:nodejs data && \
    chmod 755 data

# Switch to non-root user
USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.db
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port (if running health server)
EXPOSE 3000

# Start the scheduler
CMD ["node", "scripts/node-scheduler.js", "--mode=docker"]