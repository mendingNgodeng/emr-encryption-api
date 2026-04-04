import { Hono } from 'hono';
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import rekamMedisRoute from "./routes/rekamMedis";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());

// Health check
app.get("/", (c) => {
  return c.json({
    app: "Sistem Enkripsi Rekam Medis Elektronik",
    algoritma: "Hybrid RSA-2048 + AES-256-GCM",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.route("/rekam-medis", rekamMedisRoute);

export default {
  port: 3000,
  fetch: app.fetch,
};
