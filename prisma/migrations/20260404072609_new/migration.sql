-- CreateTable
CREATE TABLE "RekamMedis" (
    "id" TEXT NOT NULL,
    "namaEncrypted" TEXT NOT NULL,
    "nikEncrypted" TEXT NOT NULL,
    "diagnosisEncrypted" TEXT NOT NULL,
    "obatEncrypted" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RekamMedis_pkey" PRIMARY KEY ("id")
);
