const SCHOOL = {
  name: "Balchand P.P. Public School",
  phoneDisplay: "[ADD SCHOOL PHONE]",
  phoneWhatsApp: "91XXXXXXXXXX", // Replace with country code + number, digits only.
  email: "[ADD SCHOOL EMAIL]",
  address: "[ADD FULL SCHOOL ADDRESS]",
  mapUrl: "https://maps.app.goo.gl/tCiaQVBaiUht487a6"
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

function renderHeader(active = "") {
  const links = navItems.map(([label, href, key]) =>
    `<li class="nav-item"><a class="nav-link ${active === key ? "active" : ""}" ${active === key ? 'aria-current="page"' : ""} href="${href}">${label}</a></li>`
  ).join("");
  document.getElementById("site-header").innerHTML = `
    <div class="topbar py-2">
      <div class="container d-flex justify-content-between align-items-center gap-3">
        <div><i class="bi bi-geo-alt me-1"></i> ${SCHOOL.address}</div>
        <div class="topbar-right d-flex gap-3">
          <a href="tel:${SCHOOL.phoneDisplay}"><i class="bi bi-telephone me-1"></i>${SCHOOL.phoneDisplay}</a>
          <a href="mailto:${SCHOOL.email}"><i class="bi bi-envelope me-1"></i>${SCHOOL.email}</a>
        </div>
      </div>
    </div>
    <nav class="navbar navbar-expand-xl bg-white sticky-top">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
          <span class="brand-mark">BP</span>
          <span class="lh-sm"><span class="d-block fs-6">Balchand P.P.</span><small class="text-secondary fw-semibold">Public School</small></span>
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
  document.getElementById("site-footer").innerHTML = `
    <footer class="site-footer pt-5">
      <div class="container pb-4">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="d-flex align-items-center gap-2 mb-3"><span class="brand-mark">BP</span><h5 class="footer-heading mb-0">Balchand P.P. Public School</h5></div>
            <p class="text-white-50">Learning, growing and building a brighter future. Add the school's verified introduction here.</p>
            <div class="d-flex gap-3"><a href="#" aria-label="Facebook"><i class="bi bi-facebook fs-5"></i></a><a href="#" aria-label="Instagram"><i class="bi bi-instagram fs-5"></i></a><a href="#" aria-label="YouTube"><i class="bi bi-youtube fs-5"></i></a></div>
          </div>
          <div class="col-6 col-lg-2"><h6 class="footer-heading mb-3">Explore</h6><ul class="list-unstyled d-grid gap-2"><li><a href="about.html">About Us</a></li><li><a href="academics.html">Academics</a></li><li><a href="faculty.html">Faculty</a></li><li><a href="gallery.html">Gallery</a></li></ul></div>
          <div class="col-6 col-lg-2"><h6 class="footer-heading mb-3">Information</h6><ul class="list-unstyled d-grid gap-2"><li><a href="admissions.html">Admissions</a></li><li><a href="news-events.html">News & Events</a></li><li><a href="contact.html">Contact</a></li><li><a href="admin.html">Admin demo</a></li></ul></div>
          <div class="col-lg-4"><h6 class="footer-heading mb-3">Contact the school</h6><p class="text-white-50 mb-2"><i class="bi bi-geo-alt me-2"></i>${SCHOOL.address}</p><p class="text-white-50 mb-2"><i class="bi bi-telephone me-2"></i>${SCHOOL.phoneDisplay}</p><p class="text-white-50"><i class="bi bi-envelope me-2"></i>${SCHOOL.email}</p><a class="link-warning" href="${SCHOOL.mapUrl}" target="_blank" rel="noopener">View location <i class="bi bi-arrow-up-right"></i></a></div>
        </div>
      </div>
      <div class="footer-bottom py-3"><div class="container d-flex flex-column flex-md-row justify-content-between gap-2"><small>© <span data-year></span> Balchand P.P. Public School. All rights reserved.</small><small>Website information should be verified by the school before publication.</small></div></div>
    </footer>`;
}

function initCommon() {
  const header = document.getElementById("site-header");
  if (header) renderHeader(document.body.dataset.active || "");
  const footer = document.getElementById("site-footer");
  if (footer) renderFooter();
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

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

  document.querySelectorAll("[data-whatsapp]").forEach(link => {
    link.href = `https://wa.me/${SCHOOL.phoneWhatsApp}?text=${encodeURIComponent("Hello, I would like to enquire about Balchand P.P. Public School.")}`;
  });
}

document.addEventListener("DOMContentLoaded", initCommon);
