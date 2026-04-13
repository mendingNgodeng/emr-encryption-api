import crypto from "node:crypto"

// ============================================================
// PENGUJIAN ENTROPY CIPHERTEXT
// Ukur seberapa acak ciphertext yang dihasilkan
// Standar baik: mendekati 8.0 bits/byte (maksimum teoritis)
// ============================================================

function encryptAES_GCM(plaintext: string, key: Buffer, iv: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
}

function encryptAES_CBC(plaintext: string, key: Buffer): string {
  const ivCBC = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-128-cbc", key.subarray(0, 16), ivCBC)
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
}

function hitungEntropy(hexString: string): number {
  // Konversi hex ke bytes
  const bytes: number[] = []
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substring(i, i + 2), 16))
  }

  // Hitung frekuensi tiap byte (0-255)
  const freq = new Array(256).fill(0)
  for (const b of bytes) freq[b]++

  // Hitung Shannon entropy
  let entropy = 0
  for (const f of freq) {
    if (f === 0) continue
    const p = f / bytes.length
    entropy -= p * Math.log2(p)
  }

  return entropy
}

function hitungEntropyPlaintext(text: string): number {
  const bytes = Buffer.from(text, "utf8")
  const freq  = new Array(256).fill(0)
  for (const b of bytes) freq[b]++

  let entropy = 0
  for (const f of freq) {
    if (f === 0) continue
    const p = f / bytes.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

// Data uji dengan berbagai ukuran
const dataUji = [
  {
    label: "Data kecil (rekam medis 1 pasien)",
    teks: "Nama: Budi Santoso | NIK: 3201234567890001 | Diagnosis: Hipertensi Grade 1 | Obat: Amlodipine 5mg"
  },
  {
    label: "Data sedang (10 pasien)",
    teks: "Nama: Budi Santoso | NIK: 3201234567890001 | Diagnosis: Hipertensi | Obat: Amlodipine\n".repeat(10)
  },
  {
    label: "Data besar (100 pasien)",
    teks: "Nama: Budi Santoso | NIK: 3201234567890001 | Diagnosis: Hipertensi | Obat: Amlodipine\n".repeat(100)
  },
]

const aesKey = crypto.randomBytes(32)
const iv     = crypto.randomBytes(12)

console.log("=".repeat(72))
console.log("PENGUJIAN ENTROPY CIPHERTEXT — AES-256-GCM vs AES-128-CBC")
console.log("=".repeat(72))
console.log("Nilai maksimum teoritis: 8.000 bits/byte")
console.log("Nilai baik: > 7.900 bits/byte")
console.log()

console.log(
  "Data".padEnd(36),
  "Plaintext".padEnd(12),
  "GCM".padEnd(12),
  "CBC".padEnd(12),
  "Status"
)
console.log("-".repeat(72))

for (const d of dataUji) {
  const gcmCipher  = encryptAES_GCM(d.teks, aesKey, iv)
  const cbcCipher  = encryptAES_CBC(d.teks, aesKey)

  const entropyPlain = hitungEntropyPlaintext(d.teks)
  const entropyGCM   = hitungEntropy(gcmCipher)
  const entropyCBC   = hitungEntropy(cbcCipher)

  const status = entropyGCM > 7.9 && entropyCBC > 7.9 ? "✅ BAIK" : "⚠️ PERLU CEK"

  console.log(
    d.label.padEnd(36),
    `${entropyPlain.toFixed(4)}`.padEnd(12),
    `${entropyGCM.toFixed(4)}`.padEnd(12),
    `${entropyCBC.toFixed(4)}`.padEnd(12),
    status
  )
}

console.log("-".repeat(72))
console.log()

// Detail entropy per field rekam medis
console.log("=".repeat(72))
console.log("DETAIL: Entropy per field rekam medis (AES-256-GCM)")
console.log("=".repeat(72))
console.log()

const fields = [
  { field: "nama",      nilai: "Budi Santoso" },
  { field: "nik",       nilai: "3201234567890001" },
  { field: "diagnosis", nilai: "Hipertensi Grade 1" },
  { field: "obat",      nilai: "Amlodipine 5mg 1x1" },
]

console.log(
  "Field".padEnd(14),
  "Plaintext entropy".padEnd(22),
  "Ciphertext entropy".padEnd(22),
  "Peningkatan"
)
console.log("-".repeat(72))

for (const f of fields) {
  const cipher       = encryptAES_GCM(f.nilai, aesKey, iv) 
  const ePlain       = hitungEntropyPlaintext(f.nilai)
  const eCipher      = hitungEntropy(cipher)
  const peningkatan  = ((eCipher - ePlain) / ePlain * 100).toFixed(1)

  console.log(
    f.field.padEnd(14),
    `${ePlain.toFixed(4)} bits/byte`.padEnd(22),
    `${eCipher.toFixed(4)} bits/byte`.padEnd(22),
    `+${peningkatan}%`
  )
}

console.log()
console.log("✅ Selesai! Salin tabel di atas ke bagian IV.C jurnal.")