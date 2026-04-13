import crypto from "node:crypto"

// ============================================================
// PENGUJIAN AVALANCHE EFFECT
// Ubah 1 karakter input → ukur % perubahan ciphertext
// Standar baik: perubahan > 50%
// ============================================================

function encryptAES_GCM(plaintext: string, key: Buffer, iv: Buffer) {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const enc = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
  return enc
}

// CBC butuh IV 16 byte (berbeda dari GCM yang 12 byte)
const ivCBC = crypto.randomBytes(16)

function encryptAES_CBC(plaintext: string, key: Buffer) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key.subarray(0, 16), ivCBC)
  const enc = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
  return enc
}

function hitungPersentasePerubahan(cipher1: string, cipher2: string): number {
  // Bandingkan bit per bit
  let beda = 0
  const panjang = Math.max(cipher1.length, cipher2.length)

  for (let i = 0; i < panjang; i++) {
    if (cipher1[i] !== cipher2[i]) beda++
  }

  return (beda / panjang) * 100
}

function ubahSatuKarakter(text: string, posisi: number): string {
  const chars = text.split("")
  // Ubah karakter di posisi tertentu ke karakter berikutnya
  chars[posisi] = String.fromCharCode(chars[posisi].charCodeAt(0) + 1)
  return chars.join("")
}

// Data uji — simulasi field rekam medis
const dataUji = [
  { field: "nama",      nilai: "Budi Santoso" },
  { field: "nik",       nilai: "3201234567890001" },
  { field: "diagnosis", nilai: "Hipertensi Grade 1" },
  { field: "obat",      nilai: "Amlodipine 5mg 1x1" },
]

const aesKey = crypto.randomBytes(32)
const iv     = crypto.randomBytes(12)

console.log("=".repeat(70))
console.log("PENGUJIAN AVALANCHE EFFECT — AES-256-GCM vs AES-128-CBC")
console.log("=".repeat(70))
console.log()

// Header tabel
console.log(
  "Field".padEnd(12),
  "Data Asli".padEnd(22),
  "GCM (%)".padEnd(12),
  "CBC (%)".padEnd(12),
  "Standar"
)
console.log("-".repeat(70))

for (const data of dataUji) {
  const diubah = ubahSatuKarakter(data.nilai, 0)

  // Enkripsi data asli
  const gcmAsli = encryptAES_GCM(data.nilai, aesKey, iv)
  const cbcAsli = encryptAES_CBC(data.nilai, aesKey)

  // Enkripsi data yang diubah 1 karakter
  const gcmBaru = encryptAES_GCM(diubah, aesKey, iv)
  const cbcBaru = encryptAES_CBC(diubah, aesKey)

  const gcmPersen = hitungPersentasePerubahan(gcmAsli, gcmBaru)
  const cbcPersen = hitungPersentasePerubahan(cbcAsli, cbcBaru)

  const standar = gcmPersen > 50 && cbcPersen > 50 ? "✅ LULUS" : "❌ GAGAL"

  console.log(
    data.field.padEnd(12),
    data.nilai.substring(0, 20).padEnd(22),
    `${gcmPersen.toFixed(2)}%`.padEnd(12),
    `${cbcPersen.toFixed(2)}%`.padEnd(12),
    standar
  )
}

console.log("-".repeat(70))
console.log()
console.log("Keterangan: Perubahan > 50% = memenuhi standar avalanche effect")
console.log()

// Detail tambahan — uji di berbagai posisi karakter
console.log("=".repeat(70))
console.log("DETAIL: Avalanche per posisi karakter (field: diagnosis)")
console.log("=".repeat(70))
console.log()

const dataDetail = "Hipertensi Grade 1"
const posisiUji  = [0, 3, 6, 9, 12]

console.log(
  "Posisi".padEnd(10),
  "Karakter diubah".padEnd(20),
  "GCM (%)".padEnd(12),
  "CBC (%)"
)
console.log("-".repeat(55))

for (const pos of posisiUji) {
  if (pos >= dataDetail.length) continue
  const diubah  = ubahSatuKarakter(dataDetail, pos)
  const gcmAsli = encryptAES_GCM(dataDetail, aesKey, iv)
  const cbcAsli = encryptAES_CBC(dataDetail, aesKey)
  const gcmBaru = encryptAES_GCM(diubah, aesKey, iv)
  const cbcBaru = encryptAES_CBC(diubah, aesKey)

  console.log(
    `[${pos}]`.padEnd(10),
    `'${dataDetail[pos]}' → '${diubah[pos]}'`.padEnd(20),
    `${hitungPersentasePerubahan(gcmAsli, gcmBaru).toFixed(2)}%`.padEnd(12),
    `${hitungPersentasePerubahan(cbcAsli, cbcBaru).toFixed(2)}%`
  )
}

console.log()
console.log("✅ Selesai! Salin tabel di atas ke bagian IV.B jurnal.")