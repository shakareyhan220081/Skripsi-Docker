FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Salin seluruh file backend
COPY . .

# Buka port 5000 (sesuai default di server.js)
EXPOSE 5000

# Jalankan server
CMD ["node", "server.js"]