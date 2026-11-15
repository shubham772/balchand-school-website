function cmsValueIsMissing(value) {
  return typeof value !== "string" || !value.trim() || /^\[(?:ADD|CONFIRM)(?:\s|\])/i.test(value.trim());
}

function cmsSafeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value)) return value;
  try {
    const url = new URL(value, location.origin);
    if (url.protocol !== "https:" && url.origin !== location.origin) return "";
    return url.href;
  } catch {
    return "";
  }
}

function cmsDateParts(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "DATE", full: value || "" };
  return {
    day: new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
    full: new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date),
  };
}

function createCmsNotice(notice, compact = false) {
  const card = document.createElement("article");
  card.className = `notice-card p-${compact ? "3" : "4"} mb-3 d-flex gap-3`;
  const dateParts = cmsDateParts(notice.publishDate);
  const date = document.createElement("div");
  date.className = "notice-date";
  date.setAttribute("aria-label", dateParts.full);
  const day = document.createElement("strong");
  day.textContent = dateParts.day;
  const month = document.createElement("small");
  month.textContent = dateParts.month;
  date.append(day, month);
  const content = document.createElement("div");
  const badge = document.createElement("span");
  badge.className = `badge ${notice.category === "Holiday" ? "text-bg-warning" : "text-bg-primary"} mb-2`;
  badge.textContent = notice.category;
  const title = document.createElement(compact ? "h6" : "h5");
  title.className = "mb-1";
  title.textContent = notice.title;
  const description = document.createElement("p");
  description.className = `text-secondary ${compact ? "small" : ""} mb-0`;
  description.textContent = notice.description;
  content.append(badge, title, description);
  card.append(date, content);
  return card;
}

function fillNoticeLists(notices) {
  document.querySelectorAll("[data-cms-notices]").forEach(target => {
    const compact = target.dataset.cmsNotices === "compact";
    if (!notices.length) {
      const empty = document.createElement("div");
      empty.className = "cms-empty";
      empty.textContent = "There are no published notices at this time.";
      target.replaceChildren(empty);
      return;
    }
    const limited = compact ? notices.slice(0, 2) : notices;
    target.replaceChildren(...limited.map(notice => createCmsNotice(notice, compact)));
  });
}

function fillEventLists(events) {
  document.querySelectorAll("[data-cms-events]").forEach(target => {
    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "content-card p-4 cms-empty";
      empty.textContent = "There are no upcoming events at this time.";
      target.replaceChildren(empty);
      return;
    }
    const cards = events.map(event => {
      const card = document.createElement("article");
      card.className = "content-card p-4 mb-3";
      const date = document.createElement("div");
      date.className = "section-kicker mb-2";
      date.textContent = cmsDateParts(event.eventDate).full;
      const heading = document.createElement("h3");
      heading.className = "h5";
      heading.textContent = event.title;
      const details = [event.time, event.venue].filter(Boolean).join(" · ");
      card.append(date, heading);
      if (details) {
        const meta = document.createElement("p");
        meta.className = "text-school small fw-bold";
        meta.textContent = details;
        card.append(meta);
      }
      const description = document.createElement("p");
      description.className = "text-secondary mb-0";
      description.textContent = event.description;
      card.append(description);
      return card;
    });
    target.replaceChildren(...cards);
  });
}

function fillStaff(staff) {
  const target = document.querySelector("[data-cms-staff]");
  if (!target) return;
  if (!staff.length) {
    const empty = document.createElement("div");
    empty.className = "cms-empty";
    empty.textContent = "Faculty profiles will be added after the school confirms the details.";
    target.replaceChildren(empty);
    return;
  }
  target.replaceChildren(...staff.map(person => {
    const column = document.createElement("div");
    column.className = "col-sm-6 col-lg-4";
    const card = document.createElement("article");
    card.className = "person-card p-3";
    if (person.imageUrl) {
      const frame = document.createElement("div");
      frame.className = "image-frame ratio ratio-4x3 mb-3";
      const image = document.createElement("img");
      image.src = cmsSafeUrl(person.imageUrl);
      image.alt = `${person.name}, ${person.role}`;
      image.loading = "lazy";
      frame.append(image);
      card.append(frame);
    }
    const name = document.createElement("h2");
    name.className = "h5 mb-1";
    name.textContent = person.name;
    const role = document.createElement("div");
    role.className = "text-school fw-bold small";
    role.textContent = person.role;
    const bio = document.createElement("p");
    bio.className = "text-secondary small mt-2 mb-0";
    bio.textContent = person.bio;
    card.append(name, role, bio);
    column.append(card);
    return column;
  }));
}

function fillGallery(gallery) {
  const target = document.querySelector("[data-cms-gallery]");
  if (!target) return;
  if (!gallery.length) {
    const empty = document.createElement("div");
    empty.className = "cms-empty";
    empty.textContent = "Approved school photographs will be added here.";
    target.replaceChildren(empty);
    return;
  }
  target.replaceChildren(...gallery.map((item, index) => {
    const column = document.createElement("div");
    column.className = "col-6 col-lg-4";
    const figure = document.createElement("figure");
    figure.className = "mb-0";
    const button = document.createElement("button");
    button.className = "gallery-item border-0 p-0 w-100";
    button.type = "button";
    button.dataset.bsToggle = "modal";
    button.dataset.bsTarget = "#galleryModal";
    button.dataset.caption = item.caption || "";
    button.setAttribute("aria-label", `Open gallery photo ${index + 1}: ${item.altText}`);
    const image = document.createElement("img");
    image.src = cmsSafeUrl(item.imageUrl);
    image.alt = item.altText;
    image.loading = "lazy";
    button.append(image);
    figure.append(button);
    if (item.caption) {
      const caption = document.createElement("figcaption");
      caption.className = "small text-secondary mt-2";
      caption.textContent = item.caption;
      figure.append(caption);
    }
    column.append(figure);
    return column;
  }));
}

function applyCmsContent(content) {
  document.querySelectorAll("[data-cms]").forEach(element => {
    const value = content[element.dataset.cms];
    if (typeof value === "string") element.textContent = cmsValueIsMissing(value) ? "" : value;
  });
  document.querySelectorAll("[data-cms-optional]").forEach(element => {
    element.hidden = cmsValueIsMissing(content[element.dataset.cmsOptional]);
  });
  const statStrip = document.querySelector("[data-cms-stat-strip]");
  if (statStrip) {
    let visibleStats = 0;
    statStrip.querySelectorAll("[data-cms-stat]").forEach(element => {
      const missing = cmsValueIsMissing(content[element.dataset.cmsStat]);
      element.closest("[data-cms-stat-item]").hidden = missing;
      if (!missing) visibleStats += 1;
    });
    statStrip.hidden = visibleStats === 0;
  }
  const academicInfo = document.querySelector("[data-cms-academics-info]");
  if (academicInfo) {
    const infoKeys = ["academics.timings", "academics.session", "academics.medium", "academics.board"];
    academicInfo.hidden = !infoKeys.some(key => !cmsValueIsMissing(content[key]));
  }
  document.querySelectorAll("[data-cms-attr]").forEach(element => {
    const [key, attribute] = element.dataset.cmsAttr.split(":");
    const value = content[key];
    if (typeof value !== "string") return;
    if (attribute === "src") {
      const url = cmsSafeUrl(value);
      if (url) element.setAttribute("src", url);
    } else if (attribute === "href") {
      const url = cmsSafeUrl(value);
      if (url) element.setAttribute("href", url);
    }
  });
  if (window.updateSchoolProfile) window.updateSchoolProfile(content);
  const pageName = document.body.dataset.active || "";
  const pageTitles = {
    home: "Home",
    about: "About Us",
    academics: "Academics",
    faculty: "Faculty & Staff",
    admissions: "Admissions",
    gallery: "Gallery",
    news: "News & Events",
    contact: "Contact Us",
  };
  document.title = `${pageTitles[pageName] || "School"} | ${content["profile.name"] || "School"}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/public/content", { cache: "no-store" });
    if (!response.ok) throw new Error(`Content request returned ${response.status}.`);
    const data = await response.json();
    applyCmsContent(data.content || {});
    fillNoticeLists(data.notices || []);
    fillEventLists(data.events || []);
    fillStaff(data.staff || []);
    fillGallery(data.gallery || []);
  } catch (error) {
    console.error("Could not load website content from the CMS:", error.message);
    document.querySelectorAll("[data-cms-notices], [data-cms-events], [data-cms-staff], [data-cms-gallery]").forEach(target => {
      const message = document.createElement("div");
      message.className = "cms-empty";
      message.textContent = "Website content is temporarily unavailable. Please try again later.";
      target.replaceChildren(message);
    });
  }
});
