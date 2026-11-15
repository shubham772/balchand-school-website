const SCHOOL = {
  name: "Balchand P.P. Public School",
  brand: "Balchand P.P.",
  tagline: "Public School",
  phoneDisplay: "",
  phoneWhatsApp: "",
  email: "",
  address: "",
  mapUrl: "https://maps.app.goo.gl/tCiaQVBaiUht487a6",
  facebook: "",
  instagram: "",
  youtube: "",
  footerIntro: ""
};

const navItems = [
  ["Home", "index.html", "home"],
  ["About Us", "about.html", "about"],
  ["Academics", "academics.html", "academics"],
  ["Faculty", "faculty.html", "faculty"],
  ["Admissions", "admissions.html", "admissions"],
  ["Gallery", "gallery.html", "gallery"],
  ["News & Events", "news-events.html", "news"],
  ["Contact", "contact.html", "contact"]
];

function escapeHtmlValue(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function isConfigured(value) {
  return typeof value === "string" && value.trim() !== "" && !/^\[ADD(?:\s|\])/i.test(value.trim());
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
}

function getBrandMark() {
  return SCHOOL.brand.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function renderHeader(active = "") {
  const links = navItems.map(([label, href, key]) =>
    `<li class="nav-item"><a class="nav-link ${active === key ? "active" : ""}" ${active === key ? 'aria-current="page"' : ""} href="${href}">${label}</a></li>`
  ).join("");
  const topbarItems = [];
  if (isConfigured(SCHOOL.address)) {
    topbarItems.push(`<div><i class="bi bi-geo-alt me-1"></i> ${escapeHtmlValue(SCHOOL.address)}</div>`);
  }
  const contactLinks = [];
  if (isConfigured(SCHOOL.phoneDisplay)) {
    const phone = escapeHtmlValue(SCHOOL.phoneDisplay);
    contactLinks.push(`<a href="tel:${encodeURIComponent(phone)}"><i class="bi bi-telephone me-1"></i>${phone}</a>`);
  }
  if (isConfigured(SCHOOL.email)) {
    const email = escapeHtmlValue(SCHOOL.email);
    contactLinks.push(`<a href="mailto:${encodeURIComponent(email)}"><i class="bi bi-envelope me-1"></i>${email}</a>`);
  }
  if (contactLinks.length) topbarItems.push(`<div class="topbar-right d-flex gap-3">${contactLinks.join("")}</div>`);
  const topbar = topbarItems.length
    ? `<div class="topbar py-2"><div class="container d-flex justify-content-between align-items-center gap-3">${topbarItems.join("")}</div></div>`
    : "";
  document.getElementById("site-header").innerHTML = `
    ${topbar}
    <nav class="navbar navbar-expand-xl bg-white sticky-top">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
          <span class="brand-mark">${escapeHtmlValue(getBrandMark())}</span>
          <span class="lh-sm"><span class="d-block fs-6">${escapeHtmlValue(SCHOOL.brand)}</span><small class="text-secondary fw-semibold">${escapeHtmlValue(SCHOOL.tagline)}</small></span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto align-items-xl-center gap-xl-1">${links}</ul>
          <a href="admissions.html#enquiry" class="btn btn-school ms-xl-3 mt-3 mt-xl-0">Enquire Now <i class="bi bi-arrow-up-right ms-1"></i></a>
        </div>
      </div>
    </nav>`;
}

function renderFooter() {
  const socials = [
    ["facebook", "Facebook", "bi-facebook"],
    ["instagram", "Instagram", "bi-instagram"],
    ["youtube", "YouTube", "bi-youtube"]
  ].map(([key, label, icon]) => {
    const url = safeHttpUrl(SCHOOL[key]);
    return url === "#" ? "" : `<a href="${escapeHtmlValue(url)}" target="_blank" rel="noopener" aria-label="${label}"><i class="bi ${icon} fs-5"></i></a>`;
  }).join("");
  const contactDetails = [
    isConfigured(SCHOOL.address) ? `<p class="text-white-50 mb-2"><i class="bi bi-geo-alt me-2"></i>${escapeHtmlValue(SCHOOL.address)}</p>` : "",
    isConfigured(SCHOOL.phoneDisplay) ? `<p class="text-white-50 mb-2"><i class="bi bi-telephone me-2"></i>${escapeHtmlValue(SCHOOL.phoneDisplay)}</p>` : "",
    isConfigured(SCHOOL.email) ? `<p class="text-white-50"><i class="bi bi-envelope me-2"></i>${escapeHtmlValue(SCHOOL.email)}</p>` : ""
  ].filter(Boolean).join("");
  const mapUrl = safeHttpUrl(SCHOOL.mapUrl);
  const footerIntro = isConfigured(SCHOOL.footerIntro)
    ? `<p class="text-white-50">${escapeHtmlValue(SCHOOL.footerIntro)}</p>`
    : "";
  const contactColumn = contactDetails || mapUrl !== "#"
    ? `<div class="col-lg-4"><h6 class="footer-heading mb-3">Contact the school</h6>${contactDetails}${mapUrl !== "#" ? `<a class="link-warning" href="${escapeHtmlValue(mapUrl)}" target="_blank" rel="noopener">View location <i class="bi bi-arrow-up-right"></i></a>` : ""}</div>`
    : "";
  document.getElementById("site-footer").innerHTML = `
    <footer class="site-footer pt-5">
      <div class="container pb-4">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="d-flex align-items-center gap-2 mb-3"><span class="brand-mark">${escapeHtmlValue(getBrandMark())}</span><h5 class="footer-heading mb-0">${escapeHtmlValue(SCHOOL.name)}</h5></div>
            ${footerIntro}
            <div class="d-flex gap-3">${socials}</div>
          </div>
          <div class="col-6 col-lg-2"><h6 class="footer-heading mb-3">Explore</h6><ul class="list-unstyled d-grid gap-2"><li><a href="about.html">About Us</a></li><li><a href="academics.html">Academics</a></li><li><a href="faculty.html">Faculty</a></li><li><a href="gallery.html">Gallery</a></li></ul></div>
          <div class="col-6 col-lg-2"><h6 class="footer-heading mb-3">Information</h6><ul class="list-unstyled d-grid gap-2"><li><a href="admissions.html">Admissions</a></li><li><a href="news-events.html">News & Events</a></li><li><a href="contact.html">Contact</a></li><li><a href="admin.html">Admin panel</a></li></ul></div>
          ${contactColumn}
        </div>
      </div>
      <div class="footer-bottom py-3"><div class="container d-flex flex-column flex-md-row justify-content-between gap-2"><small>© ${new Date().getFullYear()} ${escapeHtmlValue(SCHOOL.name)}. All rights reserved.</small><small>Website information should be verified by the school before publication.</small></div></div>
    </footer>`;
}

window.updateSchoolProfile = profile => {
  const mappings = {
    name: "profile.name",
    brand: "profile.brand",
    tagline: "profile.tagline",
    phoneDisplay: "profile.phone",
    phoneWhatsApp: "profile.whatsapp",
    email: "profile.email",
    address: "profile.address",
    mapUrl: "profile.mapUrl",
    facebook: "profile.facebook",
    instagram: "profile.instagram",
    youtube: "profile.youtube",
    footerIntro: "profile.footerIntro"
  };
  for (const [property, key] of Object.entries(mappings)) {
    if (typeof profile[key] === "string") SCHOOL[property] = profile[key];
  }
  const header = document.getElementById("site-header");
  if (header) renderHeader(document.body.dataset.active || "");
  const footer = document.getElementById("site-footer");
  if (footer) renderFooter();
  document.querySelectorAll("[data-whatsapp]").forEach(link => {
    const number = SCHOOL.phoneWhatsApp.replace(/\D/g, "");
    link.hidden = number.length < 7;
    if (number.length >= 7) {
      link.href = `https://wa.me/${number}?text=${encodeURIComponent("Hello, I would like to enquire about " + SCHOOL.name + ".")}`;
    }
  });
};

function initCommon() {
  const backTop = document.getElementById("backTop");
  if (backTop) {
    window.addEventListener("scroll", () => backTop.classList.toggle("show", window.scrollY > 450));
    backTop.addEventListener("click", () => window.scrollTo({top: 0, behavior: "smooth"}));
  }

  document.querySelectorAll("form[data-demo-form]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      const message = form.querySelector("[data-form-success]");
      if (message) message.classList.remove("d-none");
      form.reset();
      form.classList.remove("was-validated");
    });
  });

  window.updateSchoolProfile({
    "profile.name": SCHOOL.name,
    "profile.brand": SCHOOL.brand,
    "profile.tagline": SCHOOL.tagline,
    "profile.phone": SCHOOL.phoneDisplay,
    "profile.whatsapp": SCHOOL.phoneWhatsApp,
    "profile.email": SCHOOL.email,
    "profile.address": SCHOOL.address,
    "profile.mapUrl": SCHOOL.mapUrl,
    "profile.facebook": SCHOOL.facebook,
    "profile.instagram": SCHOOL.instagram,
    "profile.youtube": SCHOOL.youtube,
    "profile.footerIntro": SCHOOL.footerIntro
  });
}

document.addEventListener("DOMContentLoaded", initCommon);
