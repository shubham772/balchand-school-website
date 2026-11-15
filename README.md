# Balchand P.P. Public School Website

Responsive multi-page frontend starter built with HTML5, CSS3, JavaScript and Bootstrap 5.

## Included
- Home, About, Academics, Faculty, Admissions, Gallery, News & Events, Contact
- Responsive shared navigation/footer
- Mobile-friendly layout
- Gallery lightbox (Bootstrap modal)
- Admission and contact form validation
- WhatsApp contact shortcut (replace placeholder phone number)
- Demo admin dashboard using browser localStorage for announcements and events
- SEO metadata and accessible labels
- MySQL-ready content structure for a future backend integration

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Use the Live Server extension and open `index.html`.
   Alternatively, run a local static server from this folder:
   `python -m http.server 8000`
   Then visit `http://localhost:8000`.

## Important before publishing
Replace all `[ADD ...]` placeholders with verified school information.
The class list, staff, facilities, school timings, admission policy, contact details and achievements are intentionally not invented.
Use real school photographs with appropriate parent/guardian consent before publishing identifiable student photos.
Update the WhatsApp number in `assets/js/app.js`.
Update the map embed URL in `contact.html` using the school's verified map location.
Update social links in the footer.

## Admin demo limitations
`admin.html` is a frontend demonstration only. It stores demo content in the current browser's localStorage.
It has no secure login and does not write to MySQL. Do not publish it as a real admin system.
For production, build a Node.js/Express API, use parameterized SQL queries, password hashing (Argon2id or bcrypt), session authentication, role-based authorization, CSRF protection, server-side validation, rate limiting and secure image uploads. Never expose MySQL credentials in browser JavaScript.

## Suggested MySQL mapping
- `school_profile`: school name, contact, address, vision, mission, map URL
- `classes`, `sections`: academic pages
- `staff`: faculty page
- `admissions`: admission enquiry form
- `announcements`: notices
- `events`: school events
- `gallery_albums`, `gallery_photos`: gallery
- `contact_messages`: contact form
- `admin_users`: future authenticated admin accounts

## Stack
- Bootstrap 5.3 via CDN
- Bootstrap Icons via CDN
- Vanilla JavaScript
- Google Fonts via CSS import
