import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { encryptRekamMedis, decryptRekamMedis } from "../utils/crypto";

const db = new PrismaClient();
const rekamMedis = new Hono();

// Ambil RSA keys dari environment
const RSA_PUBLIC_KEY = process.env.RSA_PUBLIC_KEY!.replace(/\\n/g, "\n");
const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY!.replace(/\\n/g, "\n");

// ============================================================
// POST /rekam-medis → Simpan data baru (terenkripsi)
// ============================================================
rekamMedis.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      nama: string;
      nik: string;
      diagnosis: string;
      obat: string;
    }>();

    // Validasi input
    if (!body.nama || !body.nik || !body.diagnosis || !body.obat) {
      return c.json({ error: "Semua field wajib diisi" }, 400);
    }

    // Enkripsi semua field
    const encrypted = encryptRekamMedis(body, RSA_PUBLIC_KEY);

    // Simpan ke database (semua dalam bentuk ciphertext)
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

    return c.json(
      {
        message: "Data rekam medis berhasil disimpan",
        id: record.id,
        createdAt: record.createdAt,
        performansi: {
          waktuEnkripsiMs: encrypted.waktuEnkripsiMs,
          ukuranCiphertext: {
            nama: encrypted.namaEncrypted.length,
            nik: encrypted.nikEncrypted.length,
            diagnosis: encrypted.diagnosisEncrypted.length,
          },
        },
      },
      201
    );
  } catch (error) {
    return c.json({ error: "Gagal menyimpan data", detail: String(error) }, 500);
  }
});

// ============================================================
// GET /rekam-medis → List semua (dalam bentuk ciphertext)
// ============================================================
rekamMedis.get("/", async (c) => {
  try {
    const records = await db.rekamMedis.findMany({
      select: {
        id: true,
        namaEncrypted: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      message: "Data dalam bentuk terenkripsi",
      total: records.length,
      data: records,
    });
  } catch (error) {
    return c.json({ error: "Gagal mengambil data" }, 500);
  }
});

// ============================================================
// GET /rekam-medis/:id → Ambil & dekripsi data 1 pasien
// ============================================================
rekamMedis.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const record = await db.rekamMedis.findUnique({ where: { id } });

    if (!record) {
      return c.json({ error: "Data tidak ditemukan" }, 404);
    }

    // Dekripsi semua field
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

    return c.json({
      id: record.id,
      data: {
        nama: decrypted.nama,
        nik: decrypted.nik,
        diagnosis: decrypted.diagnosis,
        obat: decrypted.obat,
      },
      createdAt: record.createdAt,
      performansi: {
        waktuDekripsiMs: decrypted.waktuDekripsiMs,
      },
    });
  } catch (error) {
    return c.json({ error: "Gagal mendekripsi data", detail: String(error) }, 500);
  }
});

// ============================================================
// DELETE /rekam-medis/:id → Hapus data
// ============================================================
rekamMedis.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.rekamMedis.delete({ where: { id } });
    return c.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    return c.json({ error: "Data tidak ditemukan" }, 404);
  }
});

export default rekamMedis;
