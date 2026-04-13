import crypto from "node:crypto"

// ============================================================
// PENGUJIAN PERFORMA — AES-256-GCM vs AES-128-CBC
// Ukur waktu enkripsi & dekripsi di berbagai ukuran data
// Ulang 100x per ukuran data → ambil rata-rata
// ============================================================

function encryptGCM(plaintext: string, key: Buffer, iv: Buffer) {
  const cipher    = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
  const authTag   = cipher.getAuthTag()
  return { encrypted, authTag }
}

function decryptGCM(encrypted: string, key: Buffer, iv: Buffer, authTag: Buffer) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8")
}

function encryptCBC(plaintext: string, key: Buffer) {
  const ivCBC  = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-128-cbc", key.subarray(0, 16), ivCBC)
  return { encrypted: cipher.update(plaintext, "utf8", "hex") + cipher.final("hex"), ivCBC }
}

function decryptCBC(encrypted: string, key: Buffer, ivCBC: Buffer) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key.subarray(0, 16), ivCBC)
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8")
}

function generateData(ukuranByte: number): string {
  // Generate string random dengan ukuran tertentu
  return crypto.randomBytes(ukuranByte).toString("base64").substring(0, ukuranByte)
}

function benchmark(fn: () => void, iterasi: number): number {
  const start = performance.now()
  for (let i = 0; i < iterasi; i++) fn()
  const end = performance.now()
  return (end - start) / iterasi // rata-rata per iterasi
}

const ITERASI   = 100
const aesKey    = crypto.randomBytes(32)
const iv        = crypto.randomBytes(12)

// Ukuran data uji
const ukuranData = [
  { label: "Sangat kecil (100 B)",   byte: 100 },
  { label: "Kecil (1 KB)",           byte: 1_024 },
  { label: "Sedang (10 KB)",         byte: 10_240 },
  { label: "Besar (100 KB)",         byte: 102_400 },
  { label: "Sangat besar (1 MB)",    byte: 1_048_576 },
]

console.log("=".repeat(80))
console.log("BENCHMARK PERFORMA — AES-256-GCM vs AES-128-CBC")
console.log(`Setiap ukuran data diuji ${ITERASI}x → diambil rata-rata`)
console.log("=".repeat(80))
console.log()

// ── Tabel Enkripsi ──────────────────────────────────────────
console.log("WAKTU ENKRIPSI (ms rata-rata)")
console.log("-".repeat(80))
console.log(
  "Ukuran Data".padEnd(26),
  "GCM (ms)".padEnd(14),
  "CBC (ms)".padEnd(14),
  "Selisih".padEnd(12),
  "Lebih cepat"
)
console.log("-".repeat(80))

const hasilEnkripsi: any[] = []

for (const d of ukuranData) {
  const data = generateData(d.byte)

  const waktuGCM = benchmark(() => encryptGCM(data, aesKey, iv), ITERASI)
  const waktuCBC = benchmark(() => encryptCBC(data, aesKey), ITERASI)

  const selisih    = Math.abs(waktuGCM - waktuCBC).toFixed(4)
  const lebihCepat = waktuGCM < waktuCBC ? "GCM" : "CBC"

  hasilEnkripsi.push({ ...d, waktuGCM, waktuCBC })

  console.log(
    d.label.padEnd(26),
    `${waktuGCM.toFixed(4)}`.padEnd(14),
    `${waktuCBC.toFixed(4)}`.padEnd(14),
    `${selisih}`.padEnd(12),
    lebihCepat
  )
}

console.log()

// ── Tabel Dekripsi ──────────────────────────────────────────
console.log("WAKTU DEKRIPSI (ms rata-rata)")
console.log("-".repeat(80))
console.log(
  "Ukuran Data".padEnd(26),
  "GCM (ms)".padEnd(14),
  "CBC (ms)".padEnd(14),
  "Selisih".padEnd(12),
  "Lebih cepat"
)
console.log("-".repeat(80))

for (const d of ukuranData) {
  const data                    = generateData(d.byte)
  const { encrypted, authTag }  = encryptGCM(data, aesKey, iv)
  const { encrypted: cbcEncrypted, ivCBC } = encryptCBC(data, aesKey)

  const waktuGCM = benchmark(() => decryptGCM(encrypted, aesKey, iv, authTag), ITERASI)
  const waktuCBC = benchmark(() => decryptCBC(cbcEncrypted, aesKey, ivCBC), ITERASI)

  const selisih    = Math.abs(waktuGCM - waktuCBC).toFixed(4)
  const lebihCepat = waktuGCM < waktuCBC ? "GCM" : "CBC"

  console.log(
    d.label.padEnd(26),
    `${waktuGCM.toFixed(4)}`.padEnd(14),
    `${waktuCBC.toFixed(4)}`.padEnd(14),
    `${selisih}`.padEnd(12),
    lebihCepat
  )
}

console.log()

// ── Tabel Ukuran Ciphertext ─────────────────────────────────
console.log("UKURAN CIPHERTEXT (bytes)")
console.log("-".repeat(68))
console.log(
  "Ukuran Data".padEnd(26),
  "Plaintext".padEnd(12),
  "GCM".padEnd(12),
  "CBC".padEnd(12),
  "Overhead GCM"
)
console.log("-".repeat(68))

for (const d of ukuranData) {
  const data         = generateData(d.byte)
  const { encrypted } = encryptGCM(data, aesKey, iv)
  const { encrypted: cbcEncrypted } = encryptCBC(data, aesKey)

  const gcmBytes      = encrypted.length / 2 // hex → bytes
  const cbcBytes      = cbcEncrypted.length / 2
  const overhead      = ((gcmBytes - d.byte) / d.byte * 100).toFixed(1)

  console.log(
    d.label.padEnd(26),
    `${d.byte} B`.padEnd(12),
    `${gcmBytes} B`.padEnd(12),
    `${cbcBytes} B`.padEnd(12),
    `+${overhead}%`
  )
}

console.log()

// ── Perbandingan RSA ─────────────────────────────────────────
console.log("=".repeat(80))
console.log("BENCHMARK RSA-2048 (enkripsi & dekripsi AES Key)")
console.log("-".repeat(80))

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding:  { type: "spki",  format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

const aesKeyToEncrypt = crypto.randomBytes(32)

const waktuRSAEnkripsi = benchmark(() => {
  crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    aesKeyToEncrypt
  )
}, ITERASI)

const encryptedAESKey = crypto.publicEncrypt(
  { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
  aesKeyToEncrypt
)

const waktuRSADekripsi = benchmark(() => {
  crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    encryptedAESKey
  )
}, ITERASI)

console.log()
console.log(`RSA-2048 enkripsi AES Key (32 byte) : ${waktuRSAEnkripsi.toFixed(4)} ms`)
console.log(`RSA-2048 dekripsi AES Key (32 byte) : ${waktuRSADekripsi.toFixed(4)} ms`)
console.log()
console.log("Catatan: RSA hanya dipakai sekali per request (enkripsi/dekripsi AES Key)")
console.log("         Beban utama tetap di AES, bukan RSA")
console.log()
console.log("✅ Selesai! Salin tabel di atas ke bagian IV.A jurnal.")