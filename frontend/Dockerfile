# Stage 1: Build Frontend (Vite/React)
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Gateway and Serve Frontend
FROM node:18-alpine

WORKDIR /app/gateway
COPY gateway/package*.json ./
RUN npm install

COPY gateway/ ./

# Copy built frontend assets to the gateway's dist folder
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE 5000
CMD ["npm", "start"]
