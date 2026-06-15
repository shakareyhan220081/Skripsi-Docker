# Gunakan Python 3.10 (ringan)
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (kadang dibutuhkan untuk pdfplumber atau library lain)
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy dan install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh file chatbot
COPY . .

# Buka port 8080 sesuai dengan setting uvicorn di app.py
EXPOSE 8080

# Jalankan server FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]