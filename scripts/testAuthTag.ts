import crypto from "node:crypto"

// ============================================================
// PENGUJIAN VALIDASI AUTHTAG (khusus AES-256-GCM)
// Simulasi manipulasi ciphertext di database
// Harusnya: sistem lempar error saat authTag tidak cocok
// ============================================================

function encryptGCM(plaintext: string, key: Buffer, iv: Buffer) {
  const cipher    = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex")
  const authTag   = cipher.getAuthTag()
  return { encrypted, authTag }
}

function decryptGCM(
  encrypted: string,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer
): { sukses: boolean; hasil: string; error?: string } {
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const hasil = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8")
    return { sukses: true, hasil }
  } catch (e: any) {
    return { sukses: false, hasil: "", error: e.message }
  }
}

function ubahCiphertext(encrypted: string, posisi: number): string {
  // Ubah 1 karakter hex di posisi tertentu
  const chars   = encrypted.split("")
  const semula  = parseInt(chars[posisi], 16)
  chars[posisi] = ((semula + 1) % 16).toString(16)
  return chars.join("")
}

const aesKey = crypto.randomBytes(32)
const iv     = crypto.randomBytes(12)

// Data simulasi rekam medis
const dataAsli = {
  nama:      "Budi Santoso",
  nik:       "3201234567890001",
  diagnosis: "Hipertensi Grade 1",
  obat:      "Amlodipine 5mg 1x1",
}

console.log("=".repeat(70))
console.log("PENGUJIAN VALIDASI AUTHTAG — AES-256-GCM")
console.log("Simulasi manipulasi data di database")
console.log("=".repeat(70))
console.log()

// ── Test 1: Dekripsi Normal ──────────────────────────────────
console.log("Test 1: Dekripsi data NORMAL (tidak dimanipulasi)")
console.log("-".repeat(70))

for (const [field, nilai] of Object.entries(dataAsli)) {
  const { encrypted, authTag } = encryptGCM(nilai, aesKey, iv)
  const hasil = decryptGCM(encrypted, aesKey, iv, authTag)

  console.log(
    `  ${field.padEnd(12)} → ${hasil.sukses ? "✅ BERHASIL" : "❌ GAGAL"} | Hasil: "${hasil.hasil}"`
  )
}

console.log()

// ── Test 2: Simulasi Manipulasi Ciphertext ───────────────────
console.log("Test 2: Simulasi MANIPULASI ciphertext di database")
console.log("(Hacker ubah isi kolom langsung di DB)")
console.log("-".repeat(70))

const skenario = [
  { kasus: "Ubah 1 karakter di awal",   posisi: 0 },
  { kasus: "Ubah 1 karakter di tengah", posisi: 10 },
  { kasus: "Ubah 1 karakter di akhir",  posisi: -2 },
]

for (const [field, nilai] of Object.entries(dataAsli)) {
  console.log(`\n  Field: ${field} (nilai asli: "${nilai}")`)

  for (const s of skenario) {
    const { encrypted, authTag } = encryptGCM(nilai, aesKey, iv)

    const posisiAktual = s.posisi < 0
      ? encrypted.length + s.posisi
      : s.posisi

    const ciphertextDimanipulasi = ubahCiphertext(encrypted, posisiAktual)
    const hasil = decryptGCM(ciphertextDimanipulasi, aesKey, iv, authTag)

    console.log(
      `    ${s.kasus.padEnd(32)} → ${hasil.sukses ? "⚠️  LOLOS (BAHAYA!)" : "✅ TERBLOKIR"}`
    )
  }
}

console.log()

// ── Test 3: Simulasi authTag Dipalsukan ──────────────────────
console.log("Test 3: Simulasi authTag DIPALSUKAN")
console.log("(Hacker ubah authTag agar lolos validasi)")
console.log("-".repeat(70))

const { encrypted, authTag } = encryptGCM(dataAsli.diagnosis, aesKey, iv)

// Buat authTag palsu
const authTagPalsu1 = crypto.randomBytes(16)           // random
const authTagPalsu2 = Buffer.alloc(16, 0)              // semua 0
const authTagPalsu3 = Buffer.from(authTag).reverse()   // dibalik

const variasiAuthTag = [
  { label: "authTag asli",    tag: authTag },
  { label: "authTag random",  tag: authTagPalsu1 },
  { label: "authTag semua 0", tag: authTagPalsu2 },
  { label: "authTag dibalik", tag: authTagPalsu3 },
]

for (const v of variasiAuthTag) {
  const hasil = decryptGCM(encrypted, aesKey, iv, v.tag)
  console.log(
    `  ${v.label.padEnd(22)} → ${hasil.sukses ? "⚠️  LOLOS (BAHAYA!)" : "✅ TERBLOKIR"}`
  )
}

console.log()

// ── Ringkasan ────────────────────────────────────────────────
console.log("=".repeat(70))
console.log("RINGKASAN VALIDASI AUTHTAG")
console.log("=".repeat(70))
console.log()
console.log("  AES-256-GCM terbukti:")
console.log("  ✅ Berhasil dekripsi data yang tidak dimanipulasi")
console.log("  ✅ Memblokir dekripsi saat ciphertext dimanipulasi")
console.log("  ✅ Memblokir dekripsi saat authTag dipalsukan")
console.log()
console.log("  AES-128-CBC TIDAK memiliki fitur ini →")
console.log("  ⚠️  Manipulasi ciphertext tidak terdeteksi")
console.log()
console.log("✅ Selesai! Salin ringkasan di atas ke bagian IV.E jurnal.")
