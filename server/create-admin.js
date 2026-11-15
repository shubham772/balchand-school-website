require("dotenv").config();

const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const bcrypt = require("bcryptjs");
const { createPool, initializeDatabase } = require("./db");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("Run this command in an interactive terminal so the password can be hidden."));
  }
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };
    const onData = character => {
      if (character === "\u0003") {
        cleanup();
        stdout.write("\n");
        reject(new Error("Cancelled."));
        return;
      }
      if (character === "\r" || character === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (character >= " ") value += character;
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
    prompt.close();
    const password = await readHidden("Admin password (12+ characters): ");
    const confirmation = await readHidden("Confirm password: ");
    if (password.length < 12 || password.length > 200) throw new Error("Use a password between 12 and 200 characters.");
    if (password !== confirmation) throw new Error("Passwords do not match.");

    const pool = createPool();
    try {
      await initializeDatabase(pool);
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.execute("INSERT INTO cms_admins (email, password_hash) VALUES (?, ?)", [email, passwordHash]);
      console.log(`Admin account created for ${email}.`);
    } finally {
      await pool.end();
    }
  } finally {
    prompt.close();
  }
}

main().catch(error => {
  console.error("Could not create admin:", error.message);
  process.exitCode = 1;
});
