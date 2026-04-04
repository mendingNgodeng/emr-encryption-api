import crypto from "node:crypto";

// ============================================================
// GENERATE RSA KEY PAIR (jalankan sekali, simpan ke .env)
// ============================================================
export function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

// ============================================================
// ENKRIPSI DATA (AES-256-GCM + RSA-OAEP)
// ============================================================
export function encryptData(plaintext: string, rsaPublicKey: string) {
  // 1. Generate kunci AES secara acak (32 byte = 256-bit)
  const aesKey = crypto.randomBytes(32);

  // 2. Generate IV secara acak (12 byte untuk GCM)
  const iv = crypto.randomBytes(12);

  // 3. Enkripsi DATA dengan AES-256-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedData =
    cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // 4. Enkripsi KUNCI AES dengan RSA public key
  const encryptedKey = crypto.publicEncrypt(
    {
      key: rsaPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  return {
    encryptedData,
    encryptedKey: encryptedKey.toString("base64"),
    iv: iv.toString("hex"),
    authTag,
  };
}

// ============================================================
// DEKRIPSI DATA (RSA-OAEP → AES-256-GCM)
// ============================================================
export function decryptData(
  encryptedData: string,
  encryptedKey: string,
  iv: string,
  authTag: string,
  rsaPrivateKey: string
) {
  // 1. Dekripsi kunci AES menggunakan RSA private key
  const aesKey = crypto.privateDecrypt(
    {
      key: rsaPrivateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedKey, "base64")
  );

  // 2. Dekripsi DATA menggunakan kunci AES
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    aesKey,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decryptedData =
    decipher.update(encryptedData, "hex", "utf8") + decipher.final("utf8");

  return decryptedData;
}

// ============================================================
// ENKRIPSI SELURUH FIELD REKAM MEDIS
// ============================================================
export function encryptRekamMedis(
  data: {
    nama: string;
    nik: string;
    diagnosis: string;
    obat: string;
  },
  rsaPublicKey: string
) {
  const startTime = performance.now();

  // Enkripsi semua field, tapi pakai 1 kunci AES + IV yang sama
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  function encryptField(text: string) {
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    const enc = cipher.update(text, "utf8", "hex") + cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return { enc, tag };
  }

  const nama = encryptField(data.nama);
  const nik = encryptField(data.nik);
  const diagnosis = encryptField(data.diagnosis);
  const obat = encryptField(data.obat);

  // Enkripsi kunci AES dengan RSA
  const encryptedKey = crypto.publicEncrypt(
    {
      key: rsaPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  const endTime = performance.now();

  return {
    namaEncrypted: nama.enc,
    nikEncrypted: nik.enc,
    diagnosisEncrypted: diagnosis.enc,
    obatEncrypted: obat.enc,
    encryptedKey: encryptedKey.toString("base64"),
    iv: iv.toString("hex"),
    // Gabungkan auth tags (per field)
    authTag: JSON.stringify({
      nama: nama.tag,
      nik: nik.tag,
      diagnosis: diagnosis.tag,
      obat: obat.tag,
    }),
    waktuEnkripsiMs: (endTime - startTime).toFixed(3),
  };
}

// ============================================================
// DEKRIPSI SELURUH FIELD REKAM MEDIS
// ============================================================
export function decryptRekamMedis(
  encrypted: {
    namaEncrypted: string;
    nikEncrypted: string;
    diagnosisEncrypted: string;
    obatEncrypted: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
  },
  rsaPrivateKey: string
) {
  const startTime = performance.now();

  // 1. Dekripsi kunci AES
  const aesKey = crypto.privateDecrypt(
    {
      key: rsaPrivateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted.encryptedKey, "base64")
  );

  const ivBuffer = Buffer.from(encrypted.iv, "hex");
  const tags = JSON.parse(encrypted.authTag);

  function decryptField(enc: string, tag: string) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, ivBuffer);
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return decipher.update(enc, "hex", "utf8") + decipher.final("utf8");
  }

  const endTime = performance.now();

  return {
    nama: decryptField(encrypted.namaEncrypted, tags.nama),
    nik: decryptField(encrypted.nikEncrypted, tags.nik),
    diagnosis: decryptField(encrypted.diagnosisEncrypted, tags.diagnosis),
    obat: decryptField(encrypted.obatEncrypted, tags.obat),
    waktuDekripsiMs: (endTime - startTime).toFixed(3),
  };
}
