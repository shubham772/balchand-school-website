require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { createPool, initializeDatabase } = require("./db");
const { fields, resources } = require("./content-schema");

const ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PAGE_FILES = new Set([
  "index.html",
  "about.html",
  "academics.html",
  "faculty.html",
  "admissions.html",
  "gallery.html",
  "news-events.html",
  "contact.html",
  "admin-login.html",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s-]{7,30}$/;
const NOTICE_CATEGORIES = new Set(["General", "Holiday", "Admission", "Event", "Important"]);

function requiredSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret === "replace-with-a-long-random-secret") {
    throw new Error("Set SESSION_SECRET to a unique random value of at least 32 characters.");
  }
  return secret;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function isValidHttpsUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidImageUrl(value, optional = false) {
  if (!value && optional) return true;
  if (typeof value !== "string") return false;
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) return true;
  return isValidHttpsUrl(value);
}

function isIsoDate(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function compareToken(expected, received) {
  if (typeof expected !== "string" || typeof received !== "string") return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sameOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.get("host");
  } catch {
    return false;
  }
}

function csrfGuard(req, res, next) {
  if (!sameOrigin(req) || !compareToken(req.session?.csrfToken, req.get("x-csrf-token"))) {
    return res.status(403).json({ error: "Request verification failed. Refresh the page and try again." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.adminId) {
    if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Sign in to continue." });
    return res.redirect("/admin-login.html");
  }
  next();
}

function getFieldValues(input, resourceName) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Provide the item fields." };
  }

  const config = resources[resourceName];
  const data = {};
  const text = (key, max, required = false) => {
    const value = input[key];
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
      return { error: `${config.labels[key]} must be ${required ? "provided and " : ""}under ${max + 1} characters.` };
    }
    data[key] = value.trim();
    return null;
  };

  for (const key of config.fields) {
    if (key === "published") {
      if (typeof input[key] !== "boolean") return { error: "Published must be true or false." };
      data[key] = input[key] ? 1 : 0;
      continue;
    }
    if (key === "sortOrder") {
      const value = Number(input[key] ?? 0);
      if (!Number.isInteger(value) || value < 0 || value > 10000) return { error: "Display order must be a whole number from 0 to 10000." };
      data[key] = value;
      continue;
    }
    if (key === "publishDate" || key === "eventDate") {
      if (!isIsoDate(input[key])) return { error: `${config.labels[key]} must be a valid date.` };
      data[key] = input[key];
      continue;
    }
    const max = key === "description" || key === "bio" ? 3000
      : key === "altText" || key === "caption" ? 250
      : key === "imageUrl" ? 500
      : key === "venue" ? 180
      : key === "time" ? 80
      : key === "category" ? 32
      : 180;
    const required = key === "title" || key === "name" || key === "role"
      || key === "category" || key === "publishDate" || key === "eventDate"
      || (key === "imageUrl" && resourceName === "gallery") || key === "altText";
    const error = text(key, max, required);
    if (error) return error;
    if (key === "category" && !NOTICE_CATEGORIES.has(data[key])) return { error: "Choose a valid notice category." };
    if (key === "imageUrl" && !isValidImageUrl(data[key], resourceName === "staff")) return { error: "Use an HTTPS image URL or an uploaded /uploads/ image." };
  }
  return { data };
}

function rowToResource(row, resourceName) {
  const config = resources[resourceName];
  const item = { id: row.id };
  config.fields.forEach((field, index) => {
    let value = row[config.columns[index]];
    if (field === "published") value = Boolean(value);
    if ((field === "publishDate" || field === "eventDate") && value instanceof Date) {
      value = value.toISOString().slice(0, 10);
    }
    item[field] = value;
  });
  return item;
}

function fileExtensionFromSignature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ".png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}

function buildApp(pool, databaseReady = Promise.resolve()) {
  const app = express();
  const store = new MySQLStore({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
    schema: { tableName: "cms_sessions" },
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 12 * 60 * 60 * 1000,
  });
  store.on("error", error => console.error("Session store error:", error.message));

  app.disable("x-powered-by");
  app.use(asyncRoute(async (req, res, next) => {
    await databaseReady;
    next();
  }));
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: ["https://*.google.com", "https://*.googleusercontent.com"],
        connectSrc: ["'self'"],
      },
    },
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(session({
    name: "bp_cms",
    secret: requiredSessionSecret(),
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 12 * 60 * 60 * 1000,
    },
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
      const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!supported.has(file.mimetype)) {
        const error = new Error("Upload a JPG, PNG, or WebP image up to 5 MB.");
        error.status = 400;
        return callback(error);
      }
      callback(null, true);
    },
  });

  app.get("/api/auth/csrf", (req, res) => {
    req.session.csrfToken ||= crypto.randomBytes(32).toString("hex");
    res.set("Cache-Control", "no-store");
    res.json({ csrfToken: req.session.csrfToken });
  });

  app.post("/api/auth/login", loginLimiter, csrfGuard, asyncRoute(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!EMAIL_PATTERN.test(email) || password.length < 1 || password.length > 200) {
      return res.status(400).json({ error: "Enter a valid email address and password." });
    }

    const [rows] = await pool.execute("SELECT id, email, password_hash FROM cms_admins WHERE email = ? LIMIT 1", [email]);
    const valid = rows.length === 1 && await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Email or password is incorrect." });

    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.adminId = rows[0].id;
    req.session.adminEmail = rows[0].email;
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.json({ email: rows[0].email, csrfToken: req.session.csrfToken });
  }));

  app.get("/api/public/content", asyncRoute(async (req, res) => {
    const [contentRows] = await pool.query("SELECT content_key, content_value FROM cms_content");
    const content = Object.fromEntries(contentRows.map(row => [row.content_key, row.content_value]));
    const queries = [
      pool.query("SELECT * FROM cms_notices WHERE published = 1 ORDER BY publish_date DESC, id DESC LIMIT 20"),
      pool.query("SELECT * FROM cms_events WHERE published = 1 AND event_date >= CURRENT_DATE ORDER BY event_date, id LIMIT 20"),
      pool.query("SELECT * FROM cms_staff WHERE published = 1 ORDER BY sort_order, id"),
      pool.query("SELECT * FROM cms_gallery WHERE published = 1 ORDER BY sort_order, id"),
    ];
    const [noticeRows, eventRows, staffRows, galleryRows] = await Promise.all(queries);
    res.set("Cache-Control", "no-store");
    res.json({
      content,
      notices: noticeRows[0].map(row => rowToResource(row, "notices")),
      events: eventRows[0].map(row => rowToResource(row, "events")),
      staff: staffRows[0].map(row => rowToResource(row, "staff")),
      gallery: galleryRows[0].map(row => rowToResource(row, "gallery")),
    });
  }));

  app.get("/api/admin/session", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ email: req.session.adminEmail });
  });

  app.post("/api/auth/logout", requireAdmin, csrfGuard, asyncRoute(async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie("bp_cms", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.status(204).end();
  }));

  app.get("/api/admin/schema", requireAdmin, (req, res) => {
    res.json({ fields, resources: Object.keys(resources) });
  });

  app.get("/api/admin/content", requireAdmin, asyncRoute(async (req, res) => {
    const [rows] = await pool.query("SELECT content_key, content_value FROM cms_content");
    res.json({ content: Object.fromEntries(rows.map(row => [row.content_key, row.content_value])) });
  }));

  app.put("/api/admin/content", requireAdmin, csrfGuard, asyncRoute(async (req, res) => {
    const values = req.body?.content;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return res.status(400).json({ error: "Provide a content object." });
    }
    const definitions = new Map(fields.map(field => [field[0], field]));
    const entries = Object.entries(values);
    if (!entries.length || entries.some(([key]) => !definitions.has(key))) {
      return res.status(400).json({ error: "The update contains an unknown content field." });
    }
    for (const [key, value] of entries) {
      const [, label, , type] = definitions.get(key);
      if (typeof value !== "string" || value.length > 5000) {
        return res.status(400).json({ error: `${label} must be text under 5000 characters.` });
      }
      if (type === "email" && value && !value.startsWith("[ADD ") && !EMAIL_PATTERN.test(value)) {
        return res.status(400).json({ error: `${label} must be a valid email address.` });
      }
      if (type === "url" && !isValidHttpsUrl(value)) {
        return res.status(400).json({ error: `${label} must be a valid HTTPS URL.` });
      }
      if (key === "profile.whatsapp" && value && !/^\d{7,20}$/.test(value)) {
        return res.status(400).json({ error: "WhatsApp number must contain 7 to 20 digits, including country code." });
      }
      if (key === "profile.phone" && value && !value.startsWith("[ADD ") && !PHONE_PATTERN.test(value)) {
        return res.status(400).json({ error: "Phone number contains unsupported characters." });
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [key, value] of entries) {
        await connection.execute(
          "INSERT INTO cms_content (content_key, content_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE content_value = VALUES(content_value)",
          [key, value],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.json({ saved: entries.length });
  }));

  app.get("/api/admin/resources/:resource", requireAdmin, asyncRoute(async (req, res) => {
    const config = resources[req.params.resource];
    if (!config) return res.status(404).json({ error: "Unknown content type." });
    const [rows] = await pool.query(`SELECT * FROM ${config.table} ORDER BY id DESC`);
    res.json({ items: rows.map(row => rowToResource(row, req.params.resource)) });
  }));

  app.post("/api/admin/resources/:resource", requireAdmin, csrfGuard, asyncRoute(async (req, res) => {
    const config = resources[req.params.resource];
    if (!config) return res.status(404).json({ error: "Unknown content type." });
    const { data, error } = getFieldValues(req.body, req.params.resource);
    if (error) return res.status(400).json({ error });
    const columns = config.columns.join(", ");
    const placeholders = config.columns.map(() => "?").join(", ");
    const [result] = await pool.execute(
      `INSERT INTO ${config.table} (${columns}) VALUES (${placeholders})`,
      config.fields.map(field => data[field]),
    );
    res.status(201).json({ id: result.insertId });
  }));

  app.put("/api/admin/resources/:resource/:id", requireAdmin, csrfGuard, asyncRoute(async (req, res) => {
    const config = resources[req.params.resource];
    const id = Number(req.params.id);
    if (!config) return res.status(404).json({ error: "Unknown content type." });
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid item ID." });
    const { data, error } = getFieldValues(req.body, req.params.resource);
    if (error) return res.status(400).json({ error });
    const updates = config.columns.map(column => `${column} = ?`).join(", ");
    const [result] = await pool.execute(
      `UPDATE ${config.table} SET ${updates} WHERE id = ?`,
      [...config.fields.map(field => data[field]), id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Item not found." });
    res.status(204).end();
  }));

  app.delete("/api/admin/resources/:resource/:id", requireAdmin, csrfGuard, asyncRoute(async (req, res) => {
    const config = resources[req.params.resource];
    const id = Number(req.params.id);
    if (!config) return res.status(404).json({ error: "Unknown content type." });
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid item ID." });
    const [result] = await pool.execute(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Item not found." });
    res.status(204).end();
  }));

  app.post("/api/admin/uploads", requireAdmin, csrfGuard, upload.single("file"), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
    const extension = fileExtensionFromSignature(req.file.buffer);
    if (!extension) return res.status(400).json({ error: "The uploaded file is not a valid JPG, PNG, or WebP image." });
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomBytes(20).toString("hex")}${extension}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer, { flag: "wx" });
    res.status(201).json({ url: `/uploads/${filename}` });
  }));

  app.get("/admin", (req, res) => res.redirect("/admin.html"));
  app.get("/admin.html", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(ROOT, "admin.html"));
  });
  app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
  app.use("/assets", express.static(path.join(ROOT, "assets"), { index: false, maxAge: "1h" }));
  app.use("/uploads", express.static(UPLOAD_DIR, { index: false, maxAge: "1d", dotfiles: "deny" }));
  app.get("/:page", (req, res, next) => {
    if (PAGE_FILES.has(req.params.page)) return res.sendFile(path.join(ROOT, req.params.page));
    next();
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
  app.use((req, res) => res.status(404).send("Page not found."));
  app.use((error, req, res, next) => {
    console.error("Request failed:", error.message);
    if (res.headersSent) return next(error);
    if (req.path.startsWith("/api/")) {
      const status = error instanceof multer.MulterError
        ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
        : Number.isInteger(error.status) ? error.status : 500;
      return res.status(status).json({ error: status === 500 ? "The request could not be completed." : error.message });
    }
    res.status(500).send("The request could not be completed.");
  });

  return app;
}

function createVercelApp() {
  const app = express();
  let handler;

  app.use((req, res, next) => {
    if (!handler) {
      try {
        requiredSessionSecret();
        const pool = createPool();
        handler = buildApp(pool, initializeDatabase(pool));
      } catch (error) {
        return next(error);
      }
    }
    return handler(req, res, next);
  });
  app.use((error, req, res, next) => {
    console.error("Could not start the CMS:", error.message);
    if (res.headersSent) return next(error);
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ error: "The service could not be initialized." });
    }
    res.status(500).send("The service could not be initialized.");
  });

  return app;
}

async function main() {
  requiredSessionSecret();
  const pool = createPool();
  await initializeDatabase(pool);
  const app = buildApp(pool);
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`School CMS available at http://localhost:${port}`));
}

if (require.main === module) {
  main().catch(error => {
    console.error("Could not start the CMS:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { createVercelApp };
