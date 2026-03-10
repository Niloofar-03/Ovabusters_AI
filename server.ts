import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("ovabusters.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    age INTEGER,
    medical_history TEXT,
    family_history TEXT,
    doctor_name TEXT,
    doctor_email TEXT,
    doctor_address TEXT,
    doctor_tel TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    fatigue_score REAL,
    symptoms TEXT,
    ai_summary TEXT,
    risk_level TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Endpoints
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, age, medical_history, family_history, doctor_name, doctor_email, doctor_address, doctor_tel } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO users (email, password, age, medical_history, family_history, doctor_name, doctor_email, doctor_address, doctor_tel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(email, password, age, JSON.stringify(medical_history), family_history, doctor_name, doctor_email, doctor_address, doctor_tel);
      res.json({ success: true, userId: info.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/logs", (req, res) => {
    const { user_id, fatigue_score, symptoms, ai_summary, risk_level } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO daily_logs (user_id, date, fatigue_score, symptoms, ai_summary, risk_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user_id, date, fatigue_score, JSON.stringify(symptoms), ai_summary, risk_level);
    res.json({ success: true });
  });

  app.get("/api/logs/:userId", (req, res) => {
    const logs = db.prepare("SELECT * FROM daily_logs WHERE user_id = ? ORDER BY date DESC").all(req.params.userId);
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
