# Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM python:3.11-slim AS backend

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY sample_docs/ ./sample_docs/

# Copy frontend build to static directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose port
EXPOSE 8080

# Start server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
