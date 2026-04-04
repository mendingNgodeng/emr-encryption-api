// Jalankan file ini SEKALI untuk generate RSA key pair
// bun run scripts/generateKeys.ts

import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("✅ RSA Key Pair berhasil di-generate!\n");
console.log("Salin ke file .env kamu:\n");

// Format untuk .env (ganti newline dengan \n)
const pubKeyEnv = publicKey.replace(/\n/g, "\\n");
const privKeyEnv = privateKey.replace(/\n/g, "\\n");

console.log(`RSA_PUBLIC_KEY="${pubKeyEnv}"`);
console.log(`\nRSA_PRIVATE_KEY="${privKeyEnv}"`);
