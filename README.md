# Showcase Skripsi - Sistem Chatbot Berbasis RAG (Retrieval-Augmented Generation)

Repositori ini berisi *source code* lengkap untuk sistem chatbot berbasis web yang dikembangkan sebagai bagian dari tugas akhir (Skripsi). Sistem ini menggunakan arsitektur **Retrieval-Augmented Generation (RAG)** untuk memberikan jawaban yang cerdas dan akurat berdasarkan dokumen atau *knowledge base* yang spesifik.

Proyek ini telah dikonfigurasi menggunakan arsitektur *microservices* dan di-dockerisasi (*dockerized*) agar mudah dijalankan (di- *deploy*) di berbagai lingkungan tanpa perlu melakukan pengaturan *environment* secara manual.

##  Tech Stack Utama

Sistem ini terbagi menjadi tiga layanan utama yang saling terintegrasi:
- **Front-end:** Next.js (TypeScript), Tailwind CSS
- **Back-end (API & Admin Management):** Node.js, Express.js, MongoDB (melalui Mongoose)
- **Chatbot Engine (RAG):** Python, FastAPI, ChromaDB (Vector Database)
- **Infrastructure:** Docker & Docker Compose

##  Struktur Direktori

- `/front-end` : Berisi antarmuka pengguna (UI) untuk halaman *landing page*, antarmuka percakapan chatbot, dan *dashboard* panel Admin.
- `/back-end` : Berisi sistem *routing*, manajemen autentikasi, riwayat obrolan (*chat history*), dan manajemen pengelolaan *knowledge base* oleh Admin.
- `/back-end/chatbot` : Mesin pemrosesan bahasa alami (NLP) berbasis Python. Menangani pemrosesan teks, penyimpanan *embedding* vektor ke ChromaDB, dan integrasi dengan API LLM dari Google.

---

## Persyaratan Sistem (Prerequisites)

Untuk menjalankan proyek ini di komputer lokal, Anda hanya perlu menginstal:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- Git

> **Catatan Penting:** Penggunaan Docker Compose meniadakan kebutuhan untuk menginstal versi Node.js tertentu, menginstal Python, atau mengatur *Virtual Environment* (`venv`) secara manual. Seluruh sistem (*database*, *frontend*, *backend*, *chatbot engine*) akan diisolasi dan dijalankan otomatis di dalam *container*.

---

##  Konfigurasi Environment Variables (.env)

Sistem ini membutuhkan pengaturan *environment variables* terpisah di masing-masing layanan. Buat file `.env` di masing-masing direktori berikut dan isi dengan *template* yang disediakan:

### 1. Front-End (`front-end/.env.local`)
Buat file bernama `.env.local` di dalam folder `front-end` dan isi dengan:
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=masukkan_site_key_recaptcha_anda_disini


### Buat file bernama .env di dalam folder back-end dan isi dengan:
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/skripsi
SESSION_SECRET=masukkan_secret_key_session_anda
PORT=5000
FASTAPI_URL=http://fastapi:8080/
RECAPTCHA_SECRET_KEY=masukkan_secret_key_recaptcha_anda
MONGO_DB_NAME=skripsi

### Buat file bernama .env di dalam folder back-end/chatbot dan isi dengan:
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/skripsi
MONGO_DB_NAME=skripsi
GOOGLE_API_KEY=masukkan_google_api_key_anda_disini

### apabila sudah di clone dan setting env lakukan docker-compose up -d --build

### Setelah proses build selesai (mungkin memakan waktu beberapa menit untuk instalasi dependencies di dalam Docker), sistem siap digunakan:
User Interface (Front-end): http://localhost:3000
Back-end API Server: http://localhost:5000
Chatbot RAG Engine: http://localhost:8080

###untuk menghentikan aplikasi 
docker-compose down


Shaka Reyhan Saputra (140810220081)

Program Studi Teknik Informatika

Universitas Padjadjaran
