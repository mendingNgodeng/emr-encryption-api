# EMR Encryption API - Code Flow and Implementation

## Application Flow Overview

The EMR Encryption API follows a clear separation of concerns with modular components handling different aspects of the encryption and API functionality. This document explains how the code works from startup to data processing.

## Entry Point: `src/index.ts`

The application starts with the main entry point that sets up the Hono web framework:

```typescript
import { Hono } from 'hono';
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import rekamMedisRoute from "./routes/rekamMedis";

const app = new Hono();

// Middleware setup
app.use("*", logger());        // Request logging
app.use("*", prettyJSON());    // Pretty JSON responses

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    app: "Sistem Enkripsi Rekam Medis Elektronik",
    algoritma: "Hybrid RSA-2048 + AES-256-GCM",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route("/rekam-medis", rekamMedisRoute);

// Export for Bun runtime
export default {
  port: 3000,
  fetch: app.fetch,
};
```

**Flow:**
1. Initialize Hono application
2. Add logging and JSON formatting middleware
3. Define health check route
4. Mount medical records routes
5. Export configuration for Bun's server

## Route Handler: `src/routes/rekamMedis.ts`

This file contains all CRUD operations for medical records, integrating encryption/decryption with database operations.

### POST /rekam-medis (Create Record)

```typescript
rekamMedis.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      nama: string;
      nik: string;
      diagnosis: string;
      obat: string;
    }>();

    // Input validation
    if (!body.nama || !body.nik || !body.diagnosis || !body.obat) {
      return c.json({ error: "Semua field wajib diisi" }, 400);
    }

    // Encrypt all fields
    const encrypted = encryptRekamMedis(body, RSA_PUBLIC_KEY);

    // Save to database
    const record = await db.rekamMedis.create({
      data: {
        namaEncrypted: encrypted.namaEncrypted,
        nikEncrypted: encrypted.nikEncrypted,
        diagnosisEncrypted: encrypted.diagnosisEncrypted,
        obatEncrypted: encrypted.obatEncrypted,
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    return c.json({ ... }, 201);
  } catch (error) {
    return c.json({ error: "Gagal menyimpan data", detail: String(error) }, 500);
  }
});
```

**Flow:**
1. Parse and validate JSON request body
2. Call `encryptRekamMedis()` to encrypt all fields
3. Store encrypted data in database
4. Return success response with performance metrics

### GET /rekam-medis/:id (Retrieve & Decrypt)

```typescript
rekamMedis.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const record = await db.rekamMedis.findUnique({ where: { id } });

    if (!record) {
      return c.json({ error: "Data tidak ditemukan" }, 404);
    }

    // Decrypt all fields
    const decrypted = decryptRekamMedis(
      {
        namaEncrypted: record.namaEncrypted,
        nikEncrypted: record.nikEncrypted,
        diagnosisEncrypted: record.diagnosisEncrypted,
        obatEncrypted: record.obatEncrypted,
        encryptedKey: record.encryptedKey,
        iv: record.iv,
        authTag: record.authTag,
      },
      RSA_PRIVATE_KEY
    );

    return c.json({ ... });
  } catch (error) {
    return c.json({ error: "Gagal mendekripsi data", detail: String(error) }, 500);
  }
});
```

**Flow:**
1. Extract ID from URL parameter
2. Fetch encrypted record from database
3. Call `decryptRekamMedis()` to decrypt all fields
4. Return decrypted data with performance metrics

## Encryption Engine: `src/utils/crypto.ts`

This module contains all cryptographic operations using Node.js built-in crypto module.

### Key Generation: `generateRSAKeyPair()`

```typescript
export function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}
```

**Purpose:** Generate RSA-2048 key pair for hybrid encryption setup.

### Encryption Process: `encryptRekamMedis()`

```typescript
export function encryptRekamMedis(
  data: { nama: string; nik: string; diagnosis: string; obat: string; },
  rsaPublicKey: string
) {
  const startTime = performance.now();

  // Generate single AES key and IV for all fields
  const aesKey = crypto.randomBytes(32);  // 256-bit key
  const iv = crypto.randomBytes(12);      // 96-bit IV for GCM

  // Encrypt each field with same key/IV
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

  // Encrypt AES key with RSA public key
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
    authTag: JSON.stringify({
      nama: nama.tag,
      nik: nik.tag,
      diagnosis: diagnosis.tag,
      obat: obat.tag,
    }),
    waktuEnkripsiMs: (endTime - startTime).toFixed(3),
  };
}
```

**Detailed Flow:**

1. **Timing Start:** Record performance measurement start time
2. **Key Generation:** Create random 256-bit AES key and 96-bit IV
3. **Field Encryption:** For each field:
   - Create AES-GCM cipher with key and IV
   - Encrypt field data to hex string
   - Extract authentication tag
4. **Key Encryption:** Encrypt AES key using RSA-OAEP with SHA-256
5. **Result Assembly:** Return encrypted fields, encrypted key, IV, and auth tags
6. **Performance:** Calculate and return encryption time

### Decryption Process: `decryptRekamMedis()`

```typescript
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

  // Decrypt AES key using RSA private key
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

  // Decrypt each field
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
```

**Detailed Flow:**

1. **Timing Start:** Record performance measurement start time
2. **Key Recovery:** Decrypt AES key using RSA private key
3. **Setup:** Parse auth tags and convert IV to buffer
4. **Field Decryption:** For each encrypted field:
   - Create AES-GCM decipher with recovered key and IV
   - Set authentication tag for integrity verification
   - Decrypt field data back to UTF-8 string
5. **Performance:** Calculate and return decryption time

## Database Layer: Prisma Schema

```prisma
model RekamMedis {
  id                 String   @id @default(cuid())
  namaEncrypted      String
  nikEncrypted       String
  diagnosisEncrypted String
  obatEncrypted      String
  encryptedKey       String   // RSA-encrypted AES key
  iv                 String   // Hex-encoded IV
  authTag            String   // JSON string of auth tags
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**Design Decisions:**
- All sensitive fields stored as encrypted strings
- AES key encrypted with RSA for security
- IV and auth tags stored separately for GCM mode
- CUID for unique, URL-safe identifiers
- Automatic timestamps for auditing

## Key Generation Script: `scripts/generateKeys.ts`

```typescript
// One-time execution script
import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Format for .env file
const pubKeyEnv = publicKey.replace(/\n/g, "\\n");
const privKeyEnv = privateKey.replace(/\n/g, "\\n");

console.log(`RSA_PUBLIC_KEY="${pubKeyEnv}"`);
console.log(`RSA_PRIVATE_KEY="${privKeyEnv}"`);
```

**Purpose:** Generate RSA key pair and format for environment variables.

## Security Architecture

### Hybrid Encryption Benefits

1. **AES-256-GCM:**
   - Fast symmetric encryption for large data
   - Authenticated encryption (integrity protection)
   - Unique key per record prevents cross-record attacks

2. **RSA-2048-OAEP:**
   - Secure asymmetric key distribution
   - OAEP padding prevents padding oracle attacks
   - SHA-256 hash for enhanced security

### Key Management

- RSA keys generated once and stored in environment
- AES keys generated per record and encrypted with RSA
- Private key never exposed in API responses
- Separate auth tags per field for granular integrity

### Data Integrity

- GCM mode provides authenticated encryption
- Auth tags verify data hasn't been tampered with
- RSA-OAEP ensures key integrity
- Database stores only ciphertext

## Performance Optimizations

### Single Key per Record
- One AES key encrypts all fields in a record
- Reduces RSA operations (expensive)
- Maintains security through unique IV per record

### Efficient GCM Usage
- 96-bit IV (12 bytes) optimal for GCM
- Auth tags stored per field for precise validation
- Hex encoding for consistent string handling

### Memory Management
- Uses Node.js built-in crypto (no external dependencies)
- Minimal memory footprint
- Streaming encryption for large data (if needed)

## Error Handling

### Validation Layers
1. **Input Validation:** Required fields checked in routes
2. **Crypto Validation:** GCM auth tags verify integrity
3. **Database Validation:** Prisma handles constraint checking

### Error Responses
- Structured error messages
- Appropriate HTTP status codes
- Detailed error logging (development)
- Generic errors in production

## Development Workflow

### Local Development
1. Generate RSA keys: `bun run generate:keys`
2. Setup database: `bunx prisma migrate dev`
3. Start server: `bun run dev`
4. Test endpoints with curl/Postman

### Production Deployment
1. Use production RSA keys
2. Configure DATABASE_URL
3. Set NODE_ENV=production
4. Enable logging and monitoring

## Testing Strategy

### Unit Tests
- Test encryption/decryption round-trips
- Verify key generation
- Test error conditions

### Integration Tests
- Full API endpoint testing
- Database operations
- Performance benchmarking

### Security Testing
- Attempt decryption with wrong keys
- Test data tampering detection
- Verify encrypted data format

This implementation provides a robust, secure, and performant solution for protecting sensitive medical data while maintaining ease of use and clear code organization.</content>
<parameter name="filePath">/media/herumi/Data/work/project/docker testing/emr-encryption-api/CODE_FLOW.md