import crypto from "node:crypto"

// ============================================================
// PENGUJIAN KEY SENSITIVITY
// Ganti 1 bit / 1 byte AES Key → ciphertext harus berubah total
// Standar baik: perubahan > 99% (hampir semua bit berubah)
// ============================================================

function encryptAES_GCM(plaintext: string, key: Buffer, iv: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
}

const ivCBC  = crypto.randomBytes(16)

function encryptAES_CBC(plaintext: string, key: Buffer): string {
  const cipher = crypto.createCipheriv("aes-128-cbc", key.subarray(0, 16), ivCBC)
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
}

function hexToBits(hex: string): string {
  return hex.split("").map(c =>
    parseInt(c, 16).toString(2).padStart(4, "0")
  ).join("")
}

function hitungPersentaseBitBeda(hex1: string, hex2: string): number {
  const bits1 = hexToBits(hex1)
  const bits2 = hexToBits(hex2)
  const panjang = Math.min(bits1.length, bits2.length)
  let beda = 0
  for (let i = 0; i < panjang; i++) {
    if (bits1[i] !== bits2[i]) beda++
  }
  return (beda / panjang) * 100
}

function ubahSateBit(key: Buffer, posisiByte: number, posisiBit: number): Buffer {
  const newKey = Buffer.from(key)
  // XOR 1 bit di posisi tertentu
  newKey[posisiByte] ^= (1 << posisiBit)
  return newKey
}

function ubahSateByte(key: Buffer, posisiByte: number): Buffer {
  const newKey = Buffer.from(key)
  newKey[posisiByte] = (newKey[posisiByte] + 1) % 256
  return newKey
}

const data   = "Nama: Budi Santoso | NIK: 3201234567890001 | Diagnosis: Hipertensi | Obat: Amlodipine 5mg"
const aesKey = crypto.randomBytes(32)
const iv     = crypto.randomBytes(12)

console.log("=".repeat(68))
console.log("PENGUJIAN KEY SENSITIVITY — AES-256-GCM vs AES-128-CBC")
console.log("=".repeat(68))
console.log("Standar: perubahan bit ciphertext > 99% saat 1 bit key diubah")
console.log()

// Test 1: Ubah 1 bit di berbagai posisi byte
console.log("Test 1: Ubah 1 bit key di berbagai posisi")
console.log("-".repeat(68))
console.log(
  "Posisi byte".padEnd(14),
  "Bit diubah".padEnd(14),
  "GCM (% bit beda)".padEnd(20),
  "CBC (% bit beda)"
)
console.log("-".repeat(68))

const gcmAsli = encryptAES_GCM(data, aesKey, iv)
const cbcAsli = encryptAES_CBC(data, aesKey)

const posisiUji = [0, 4, 8, 15, 24, 31]

for (const pos of posisiUji) {
  for (const bit of [0, 7]) {
    const keyBaru  = ubahSateBit(aesKey, pos, bit)
    const gcmBaru  = encryptAES_GCM(data, keyBaru, iv)
    const cbcBaru  = encryptAES_CBC(data, keyBaru)

    const gcmPersen = hitungPersentaseBitBeda(gcmAsli, gcmBaru)
    const cbcPersen = hitungPersentaseBitBeda(cbcAsli, cbcBaru)

    console.log(
      `byte[${pos}]`.padEnd(14),
      `bit ${bit}`.padEnd(14),
      `${gcmPersen.toFixed(2)}%`.padEnd(20),
      `${cbcPersen.toFixed(2)}%`
    )
  }
}

console.log()

// Test 2: Ubah 1 byte di berbagai posisi
console.log("Test 2: Ubah 1 byte key (+1) di berbagai posisi")
console.log("-".repeat(68))
console.log(
  "Posisi byte".padEnd(14),
  "Nilai lama".padEnd(14),
  "GCM (% bit beda)".padEnd(20),
  "CBC (% bit beda)"
)
console.log("-".repeat(68))

for (const pos of posisiUji) {
  const keyBaru  = ubahSateByte(aesKey, pos)
  const gcmBaru  = encryptAES_GCM(data, keyBaru, iv)
  const cbcBaru  = encryptAES_CBC(data, keyBaru)

  const gcmPersen = hitungPersentaseBitBeda(gcmAsli, gcmBaru)
  const cbcPersen = hitungPersentaseBitBeda(cbcAsli, cbcBaru)

  console.log(
    `byte[${pos}]`.padEnd(14),
    `0x${aesKey[pos].toString(16).padStart(2, "0")}`.padEnd(14),
    `${gcmPersen.toFixed(2)}%`.padEnd(20),
    `${cbcPersen.toFixed(2)}%`
  )
}

console.log()

// Ringkasan
console.log("=".repeat(68))
console.log("RINGKASAN KEY SENSITIVITY")
console.log("=".repeat(68))

let totalGCM = 0, totalCBC = 0, count = 0

for (const pos of posisiUji) {
  const keyBaru  = ubahSateByte(aesKey, pos)
  const gcmBaru  = encryptAES_GCM(data, keyBaru, iv)
  const cbcBaru  = encryptAES_CBC(data, keyBaru)
  totalGCM += hitungPersentaseBitBeda(gcmAsli, gcmBaru)
  totalCBC += hitungPersentaseBitBeda(cbcAsli, cbcBaru)
  count++
}

const rataGCM = totalGCM / count
const rataCBC = totalCBC / count

console.log()
console.log(`Rata-rata perubahan bit — AES-256-GCM : ${rataGCM.toFixed(2)}%`)
console.log(`Rata-rata perubahan bit — AES-128-CBC : ${rataCBC.toFixed(2)}%`)
console.log()
console.log(rataGCM > 99 ? "✅ GCM: LULUS standar key sensitivity" : "⚠️  GCM: Perlu diperiksa")
console.log(rataCBC > 99 ? "✅ CBC: LULUS standar key sensitivity" : "⚠️  CBC: Perlu diperiksa")
console.log()
console.log("✅ Selesai! Salin tabel di atas ke bagian IV.D jurnal.")