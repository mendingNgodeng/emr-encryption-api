# 🏥 EMR Encryption API

> Implementasi enkripsi hybrid **RSA-2048 + AES-256-GCM** untuk keamanan data Rekam Medis Elektronik (RME) berbasis REST API.

![Bun](https://img.shields.io/badge/Bun-1.x-black?logo=bun)
![Hono](https://img.shields.io/badge/Hono-4.x-orange)
![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 Tentang Proyek

Proyek ini merupakan implementasi sistem enkripsi data rekam medis elektronik menggunakan algoritma **hybrid RSA + AES**. Setiap field sensitif pasien (nama, NIK, diagnosis, obat) dienkripsi sebelum disimpan ke database, sehingga data tidak dapat dibaca meskipun database berhasil diakses oleh pihak tidak berwenang.

### Kenapa Hybrid RSA + AES?

| Algoritma | Peran | Alasan |
|-----------|-------|--------|
| **AES-256-GCM** | Enkripsi data | Cepat untuk data besar, ada authentication tag |
| **RSA-2048** | Enkripsi kunci AES | Aman untuk distribusi kunci, asymmetric |

Keduanya dikombinasikan untuk mendapatkan keunggulan masing-masing: **kecepatan AES** + **keamanan distribusi kunci RSA**.

---

## 🛠️ Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **Framework** — [Hono](https://hono.dev)
- **ORM** — [Prisma](https://www.prisma.io) v6.19
- **Database** — PostgreSQL
- **Enkripsi** — `node:crypto` (built-in, tanpa library eksternal)

---

## 📁 Struktur Project

```
emr-encryption-api/
├── src/
│   ├── index.ts              # Entry point & konfigurasi Hono
│   ├── routes/
│   │   └── rekamMedis.ts     # CRUD endpoint rekam medis
│   └── lib/
│       └── crypto.ts         # Logic enkripsi RSA + AES
├── prisma/
│   └── schema.prisma         # Model database
├── scripts/
│   └── generateKeys.ts       # Generate RSA key pair
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Cara Menjalankan

### Prasyarat
- [Bun](https://bun.sh) versi 1.x
- PostgreSQL

### 1. Clone repository
```bash
git clone https://github.com/username/emr-encryption-api.git
cd emr-encryption-api
```

### 2. Install dependencies
```bash
bun install
```

### 3. Setup environment
```bash
cp .env.example .env
```
Isi `DATABASE_URL` di file `.env` dengan koneksi PostgreSQL kamu.

### 4. Generate RSA Key Pair
```bash
bun run generate:keys
```
Salin output yang muncul ke file `.env`.

### 5. Migrasi database
```bash
bunx prisma migrate dev --name init
```

### 6. Jalankan server
```bash
bun run dev
```
Server berjalan di `http://localhost:3000` 🎉

---

## 📡 API Endpoints

### `GET /`
Health check & info sistem.

```json
{
  "app": "Sistem Enkripsi Rekam Medis Elektronik",
  "algoritma": "Hybrid RSA-2048 + AES-256-GCM",
  "status": "running"
}
```

---

### `POST /rekam-medis`
Simpan data rekam medis baru. Data otomatis dienkripsi sebelum masuk database.

**Request Body:**
```json
{
  "nama": "Budi Santoso",
  "nik": "3201234567890001",
  "diagnosis": "Hipertensi Grade 1",
  "obat": "Amlodipine 5mg 1x1"
}
```

**Response:**
```json
{
  "message": "Data rekam medis berhasil disimpan",
  "id": "cmnk0q32b0000uc8k3hyikqef",
  "createdAt": "2026-04-04T07:35:44.385Z",
  "performansi": {
    "waktuEnkripsiMs": "1.234",
    "ukuranCiphertext": {
      "nama": 32,
      "nik": 32,
      "diagnosis": 40
    }
  }
}
```

---

### `GET /rekam-medis`
Ambil semua data dalam bentuk **ciphertext** (tidak didekripsi).

```json
{
  "message": "Data dalam bentuk terenkripsi",
  "total": 2,
  "data": [
    {
      "id": "cmnk0q32b0000uc8k3hyikqef",
      "namaEncrypted": "859a40a167...",
      "createdAt": "2026-04-04T07:35:44.385Z"
    }
  ]
}
```

---

### `GET /rekam-medis/:id`
Ambil & dekripsi data satu pasien berdasarkan ID.

```json
{
  "id": "cmnk0q32b0000uc8k3hyikqef",
  "data": {
    "nama": "Budi Santoso",
    "nik": "3201234567890001",
    "diagnosis": "Hipertensi Grade 1",
    "obat": "Amlodipine 5mg 1x1"
  },
  "createdAt": "2026-04-04T07:35:44.385Z",
  "performansi": {
    "waktuDekripsiMs": "0.987"
  }
}
```

---

### `DELETE /rekam-medis/:id`
Hapus data rekam medis berdasarkan ID.

```json
{
  "message": "Data berhasil dihapus"
}
```

---

## 🔐 Alur Enkripsi

```
Data Plaintext (nama, nik, diagnosis, obat)
        │
        ▼
┌─────────────────────────────┐
│  Generate AES Key (256-bit) │  ← random setiap request
│  Generate IV (12 byte)      │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Enkripsi DATA              │
│  AES-256-GCM                │  → Ciphertext + Auth Tag
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Enkripsi AES Key           │
│  RSA-2048 OAEP (SHA-256)    │  → Encrypted Key
└─────────────────────────────┘
        │
        ▼
  Simpan ke Database
  (Ciphertext + Encrypted Key + IV + Auth Tag)
```

**Dekripsi (kebalikannya):**
```
Encrypted Key → [RSA Private Key] → AES Key
Ciphertext    → [AES Key + IV]    → Plaintext
```

---

## 📊 Parameter Teknis

| Parameter | Nilai |
|-----------|-------|
| Algoritma enkripsi data | AES-256-GCM |
| Algoritma enkripsi kunci | RSA-2048 OAEP |
| Hash padding RSA | SHA-256 |
| Ukuran kunci AES | 256 bit (32 byte) |
| Ukuran kunci RSA | 2048 bit |
| Ukuran IV | 12 byte |
| Ukuran Auth Tag | 16 byte |

---

## 📜 Lisensi

[MIT](LICENSE) © 2026
