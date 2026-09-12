# =========================
# Stage 1: Build Angular
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies dahulu untuk cache layer
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Production build
RUN npm run build


# =========================
# Stage 2: Serve
# =========================
FROM nginx:alpine

# Buang default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build
COPY --from=builder /app/dist/*/browser /usr/share/nginx/html/

# SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]