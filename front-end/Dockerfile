# 1. Pilih base image (ibaratnya kita pakai OS Linux kecil yang sudah ada Node.js versi 20)
FROM node:20-alpine

# 2. Tentukan folder kerja di dalam container nantinya
WORKDIR /app

# 3. Salin file package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# 4. Install semua library/dependencies (termasuk React, Next, Tailwind, dll)
RUN npm install

# 5. Setelah install selesai, salin seluruh file kode front-end kamu ke dalam container
COPY . .

# 6. Lakukan proses build Next.js (wajib untuk production)
RUN npm run build

# 7. Beri tahu Docker bahwa aplikasi ini akan berjalan di port 3000
EXPOSE 3000

# 8. Perintah terakhir untuk menyalakan aplikasinya
CMD ["npm", "start"]