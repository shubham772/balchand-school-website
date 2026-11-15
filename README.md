# Balchand P.P. Public School Website

Responsive school website with an Express/MySQL content management system.

## Requirements

- Node.js 20 or newer
- MySQL 8 or a compatible MySQL server

## Local setup

1. Install the project dependencies:

   ```powershell
   npm install
   ```

2. Use the existing `balchand_school` database, or create it if it does not exist. Create a dedicated database user in MySQL:

   ```sql
   CREATE DATABASE IF NOT EXISTS balchand_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'school_cms'@'127.0.0.1' IDENTIFIED BY 'use-a-unique-database-password';
   GRANT ALL PRIVILEGES ON balchand_school.* TO 'school_cms'@'127.0.0.1';
   ```

3. Copy `.env.example` to `.env`, then set the MySQL connection details and a unique session secret. Generate a session secret with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Create the first admin account:

   ```powershell
   npm run create-admin
   ```

   The command prompts for an email and a password of at least 12 characters. Password input is hidden. Admin accounts are not created automatically.

5. Start the website:

   ```powershell
   npm start
   ```

   Open `http://localhost:3000`. The first run creates the CMS tables and inserts editable starter content. Sign in at `/admin` or select **Admin panel** in the footer.

The CMS uses its own `cms_*` tables in this database and does not change the existing school tables.

Use the Express server for the website. Static hosting and VS Code Live Server do not provide the CMS API or protect the admin page.

## Admin features

- Edit school profile, contact details, map URLs, social links, and public page copy.
- Create, edit, publish, and delete notices, events, faculty profiles, and gallery items.
- Upload JPG, PNG, or WebP images up to 5 MB; uploaded files are stored in `uploads/`.
- Unpublished records remain hidden from public pages.

The public contact and admission forms currently provide browser-side validation only; they do not deliver submissions to the school. A server-side form endpoint and delivery workflow must be implemented before relying on them.

## Production notes

- Set `NODE_ENV=production` and serve the site over HTTPS. The session cookie is marked secure in production.
- Set `TRUST_PROXY=true` only when the app is behind one trusted reverse proxy configured to forward client IP and HTTPS information correctly.
- Use a unique, high-entropy `SESSION_SECRET` and a restricted MySQL account. Keep `.env` private and never put credentials in frontend files.
- Back up the MySQL database and `uploads/` directory. The hosting platform must provide persistent storage for uploads.
- The app uses Helmet security headers, CSRF/origin checks, login rate limiting, parameterized database queries, password hashing, server-side validation, and session-backed authentication.
- Replace all `[ADD ...]` placeholders with verified school information. Publish identifiable student photographs only with appropriate consent.

## Stack

- Node.js and Express
- MySQL (`mysql2`) with MySQL-backed sessions
- Bootstrap 5.3, Bootstrap Icons, and vanilla JavaScript
