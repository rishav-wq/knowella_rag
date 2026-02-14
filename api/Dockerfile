# Node.js runtime for the API
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose API port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
