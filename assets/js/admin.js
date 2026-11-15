const alertBox = document.getElementById("adminAlert");
const resourceForms = new Map();
let csrfToken = "";
let fields = [];

const resourceFields = {
  notices: [
    { key: "title", label: "Title", type: "text", required: true, maxLength: 180 },
    { key: "category", label: "Category", type: "select", required: true, options: ["General", "Holiday", "Admission", "Event", "Important"] },
    { key: "publishDate", label: "Publish date", type: "date", required: true },
    { key: "description", label: "Description", type: "textarea", rows: 4, maxLength: 3000 },
    { key: "published", label: "Publish this notice on the website", type: "checkbox" },
  ],
  events: [
    { key: "title", label: "Event title", type: "text", required: true, maxLength: 180 },
    { key: "eventDate", label: "Event date", type: "date", required: true },
    { key: "time", label: "Time", type: "text", maxLength: 80 },
    { key: "venue", label: "Venue", type: "text", maxLength: 180 },
    { key: "description", label: "Description", type: "textarea", rows: 4, maxLength: 3000 },
    { key: "published", label: "Publish this event on the website", type: "checkbox" },
  ],
  staff: [
    { key: "name", label: "Name", type: "text", required: true, maxLength: 120 },
    { key: "role", label: "Role / designation", type: "text", required: true, maxLength: 120 },
    { key: "bio", label: "Biography", type: "textarea", rows: 4, maxLength: 3000 },
    { key: "imageUrl", label: "Photo URL", type: "imageUrl", maxLength: 500 },
    { key: "sortOrder", label: "Display order", type: "number", min: 0, max: 10000 },
    { key: "published", label: "Publish this profile on the website", type: "checkbox" },
  ],
  gallery: [
    { key: "imageUrl", label: "Photo URL", type: "imageUrl", required: true, maxLength: 500 },
    { key: "altText", label: "Alternative text", type: "text", required: true, maxLength: 250 },
    { key: "caption", label: "Caption", type: "text", maxLength: 250 },
    { key: "sortOrder", label: "Display order", type: "number", min: 0, max: 10000 },
    { key: "published", label: "Publish this photo on the website", type: "checkbox" },
  ],
};

function showMessage(message, type = "success") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  if (type === "success") {
    window.setTimeout(() => {
      if (alertBox.textContent === message) alertBox.classList.add("d-none");
    }, 5000);
  }
}

async function request(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (method !== "GET" && method !== "HEAD") headers.set("X-CSRF-Token", csrfToken);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, method, headers, credentials: "same-origin" });
  const result = response.status === 204 ? null : await response.json();
  if (response.status === 401) {
    location.assign("/admin-login.html");
    throw new Error("Your session has ended. Sign in again.");
  }
  if (!response.ok) throw new Error(result?.error || "The request could not be completed.");
  return result;
}

function fieldControl(field, value = "") {
  const wrapper = document.createElement("div");
  wrapper.className = field.type === "checkbox" ? "col-12" : "col-md-6 admin-field";
  const id = `field-${field.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  if (field.type === "checkbox") {
    const holder = document.createElement("div");
    holder.className = "form-check";
    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.id = id;
    input.name = field.key;
    input.checked = Boolean(value);
    const label = document.createElement("label");
    label.className = "form-check-label fw-bold";
    label.htmlFor = id;
    label.textContent = field.label;
    holder.append(input, label);
    wrapper.append(holder);
    return wrapper;
  }

  const label = document.createElement("label");
  label.className = "form-label";
  label.htmlFor = id;
  label.textContent = field.label;
  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = field.rows || 3;
  } else if (field.type === "select") {
    input = document.createElement("select");
    input.className = "form-select";
    for (const optionText of field.options || []) {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      input.append(option);
    }
  } else {
    input = document.createElement("input");
    input.type = field.type === "imageUrl" ? "text" : field.type;
    if (field.type === "imageUrl") input.inputMode = "url";
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
  }
  input.classList.add("form-control");
  input.id = id;
  input.name = field.key;
  input.value = value ?? "";
  if (field.required) input.required = true;
  if (field.maxLength) input.maxLength = field.maxLength;
  wrapper.append(label, input);

  if (field.type === "imageUrl") {
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "image/jpeg,image/png,image/webp";
    uploadInput.className = "form-control";
    uploadInput.setAttribute("aria-label", `Upload ${field.label.toLowerCase()}`);
    const help = document.createElement("div");
    help.className = "form-text";
    help.textContent = "Or upload a JPG, PNG, or WebP image up to 5 MB.";
    wrapper.append(uploadInput, help);
    uploadInput.addEventListener("change", async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;
      const body = new FormData();
      body.append("file", file);
      try {
        const result = await request("/api/admin/uploads", { method: "POST", body });
        input.value = result.url;
        showMessage("Image uploaded. Save the item to publish its URL.");
      } catch (error) {
        showMessage(error.message, "danger");
      } finally {
        uploadInput.value = "";
      }
    });
  }
  return wrapper;
}

function renderContentFields(container, group, content) {
  const groupFields = fields.filter(field => field.group === group);
  const form = document.createElement("form");
  form.className = "row g-3";
  for (const field of groupFields) {
    const value = content[field.key] ?? "";
    form.append(fieldControl({ key: field.key, label: field.label, type: field.type, required: false, maxLength: 5000 }, value));
  }
  container.replaceChildren(form);
  return form;
}

function renderPageGroups(container, content) {
  const groups = [...new Set(fields.map(field => field.group).filter(group => group !== "School profile"))];
  const accordion = document.createElement("div");
  accordion.className = "accordion admin-accordion";
  accordion.id = "pageContentAccordion";
  groups.forEach((group, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item content-card overflow-hidden";
    const headingId = `page-heading-${index}`;
    const collapseId = `page-collapse-${index}`;
    const heading = document.createElement("h2");
    heading.className = "accordion-header";
    heading.id = headingId;
    const toggle = document.createElement("button");
    toggle.className = `accordion-button${index ? " collapsed" : ""}`;
    toggle.type = "button";
    toggle.dataset.bsToggle = "collapse";
    toggle.dataset.bsTarget = `#${collapseId}`;
    toggle.setAttribute("aria-expanded", index ? "false" : "true");
    toggle.setAttribute("aria-controls", collapseId);
    toggle.textContent = group;
    heading.append(toggle);
    const collapse = document.createElement("div");
    collapse.id = collapseId;
    collapse.className = `accordion-collapse collapse${index ? "" : " show"}`;
    collapse.setAttribute("aria-labelledby", headingId);
    collapse.dataset.bsParent = "#pageContentAccordion";
    const body = document.createElement("div");
    body.className = "accordion-body p-4";
    const form = document.createElement("form");
    form.className = "row g-3";
    fields.filter(field => field.group === group).forEach(field => {
      form.append(fieldControl({
        key: field.key,
        label: field.label,
        type: field.type,
        required: false,
        maxLength: 5000,
      }, content[field.key] ?? ""));
    });
    body.append(form);
    const actions = document.createElement("div");
    actions.className = "admin-form-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-school";
    save.dataset.saveGroup = group;
    save.textContent = `Save ${group.toLowerCase()}`;
    const status = document.createElement("span");
    status.dataset.saveStatus = group;
    status.setAttribute("role", "status");
    actions.append(save, status);
    body.append(actions);
    collapse.append(body);
    item.append(heading, collapse);
    accordion.append(item);
  });
  container.replaceChildren(accordion);
}

function resourceFieldDefinitions(resource) {
  return resourceFields[resource] || [];
}

function resourceInputFields(resource, item = {}) {
  const fields = resourceFieldDefinitions(resource);
  const form = document.querySelector(`[data-resource-form="${resource}"]`);
  const grid = document.createElement("div");
  grid.className = "row g-3";
  fields.forEach(field => grid.append(fieldControl(field, item[field.key] ?? (field.type === "checkbox" ? true : ""))));
  const actions = document.createElement("div");
  actions.className = "col-12 d-flex flex-wrap gap-2 mt-3";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn btn-school";
  save.textContent = item.id ? "Save changes" : "Save";
  actions.append(save);
  if (item.id) {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-outline-secondary";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => resetResourceForm(resource));
    actions.append(cancel);
  }
  grid.append(actions);
  form.replaceChildren(grid);
  form.dataset.editId = item.id || "";
  document.querySelector(`[data-resource-form-title="${resource}"]`).textContent = item.id ? "Edit item" : `New ${resource === "staff" ? "profile" : resource === "gallery" ? "photo" : resource.slice(0, -1)}`;
}

function resetResourceForm(resource) {
  resourceInputFields(resource);
}

function addRecordText(parent, text, className) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  parent.append(element);
}

function renderResourceList(resource, items) {
  const list = document.querySelector(`[data-resource-list="${resource}"]`);
  const count = document.querySelector(`[data-resource-count="${resource}"]`);
  count.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "admin-empty";
    empty.textContent = `No ${resource === "staff" ? "profiles" : resource} added yet.`;
    list.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const record = document.createElement("article");
    record.className = "admin-record";
    const main = document.createElement("div");
    main.className = "admin-record-main";
    if (item.imageUrl) {
      const image = document.createElement("img");
      image.src = item.imageUrl;
      image.alt = resource === "gallery" ? item.altText : "";
      image.loading = "lazy";
      main.append(image);
    }
    const details = document.createElement("div");
    const title = resource === "staff" ? item.name : resource === "gallery" ? item.caption || item.altText : item.title;
    addRecordText(details, title || "Untitled", "admin-record-title");
    const meta = resource === "notices"
      ? `${item.category} · ${item.publishDate} · ${item.published ? "Published" : "Draft"}`
      : resource === "events"
        ? `${item.eventDate}${item.time ? ` · ${item.time}` : ""} · ${item.published ? "Published" : "Draft"}`
        : resource === "staff"
          ? `${item.role} · ${item.published ? "Published" : "Draft"}`
          : `${item.altText} · ${item.published ? "Published" : "Draft"}`;
    addRecordText(details, meta, "admin-record-meta");
    const description = resource === "notices" || resource === "events" ? item.description : resource === "staff" ? item.bio : "";
    if (description) addRecordText(details, description, "admin-record-description");
    main.append(details);
    const actions = document.createElement("div");
    actions.className = "admin-record-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-outline-school btn-sm";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => resourceInputFields(resource, item));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-outline-danger btn-sm";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete “${title || "this item"}”? This cannot be undone.`)) return;
      try {
        await request(`/api/admin/resources/${resource}/${item.id}`, { method: "DELETE" });
        await loadResource(resource);
        showMessage("Item deleted.");
      } catch (error) {
        showMessage(error.message, "danger");
      }
    });
    actions.append(edit, remove);
    record.append(main, actions);
    fragment.append(record);
  }
  list.replaceChildren(fragment);
}

async function loadResource(resource) {
  const result = await request(`/api/admin/resources/${resource}`);
  renderResourceList(resource, result.items);
}

function collectResourceForm(resource) {
  const form = document.querySelector(`[data-resource-form="${resource}"]`);
  const item = {};
  for (const field of resourceFieldDefinitions(resource)) {
    const input = form.elements.namedItem(field.key);
    item[field.key] = field.type === "checkbox"
      ? input.checked
      : field.type === "number"
        ? Number(input.value || 0)
        : input.value;
  }
  return item;
}

function connectResourceForm(resource) {
  const form = document.querySelector(`[data-resource-form="${resource}"]`);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const id = form.dataset.editId;
    const url = `/api/admin/resources/${resource}${id ? `/${id}` : ""}`;
    try {
      await request(url, { method: id ? "PUT" : "POST", body: JSON.stringify(collectResourceForm(resource)) });
      resetResourceForm(resource);
      await loadResource(resource);
      showMessage("Changes saved.");
    } catch (error) {
      showMessage(error.message, "danger");
    }
  });
  resetResourceForm(resource);
}

async function saveContentGroup(group) {
  const form = group === "School profile"
    ? document.querySelector("#profileFields form")
    : [...document.querySelectorAll("#pageContentGroups form")].find(candidate => candidate.querySelector(`[name^="${group.toLowerCase().split(" ")[0]}."]`));
  if (!form) throw new Error(`Could not find the ${group.toLowerCase()} form.`);
  const content = {};
  for (const field of fields.filter(item => item.group === group)) {
    content[field.key] = form.elements.namedItem(field.key).value;
  }
  await request("/api/admin/content", { method: "PUT", body: JSON.stringify({ content }) });
  const status = document.querySelector(`[data-save-status="${group}"]`);
  if (status) status.textContent = "Saved.";
  showMessage(`${group} saved.`);
}

function setActivePanel(name) {
  document.querySelectorAll("[data-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === name));
  document.querySelectorAll("[data-panel-target]").forEach(button => {
    const active = button.dataset.panelTarget === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

async function initializeAdmin() {
  const [csrf, identity, schema, data] = await Promise.all([
    request("/api/auth/csrf"),
    request("/api/admin/session"),
    request("/api/admin/schema"),
    request("/api/admin/content"),
  ]);
  csrfToken = csrf.csrfToken;
  fields = schema.fields.map(([key, label, group, type]) => ({ key, label, group, type }));
  document.getElementById("adminIdentity").textContent = identity.email;
  document.querySelectorAll("[data-admin-school]").forEach(element => {
    element.textContent = data.content["profile.name"] || "School website";
  });
  renderContentFields(document.getElementById("profileFields"), "School profile", data.content);
  renderPageGroups(document.getElementById("pageContentGroups"), data.content);
  Object.keys(resourceFields).forEach(connectResourceForm);
  await Promise.all(Object.keys(resourceFields).map(loadResource));
}

document.querySelectorAll("[data-panel-target]").forEach(button => {
  button.addEventListener("click", () => setActivePanel(button.dataset.panelTarget));
});

document.querySelectorAll("[data-save-group]").forEach(button => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await saveContentGroup(button.dataset.saveGroup);
    } catch (error) {
      showMessage(error.message, "danger");
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-create-resource]").forEach(button => {
  button.addEventListener("click", () => {
    const resource = button.dataset.createResource;
    resetResourceForm(resource);
    document.querySelector(`[data-resource-form="${resource}"]`).scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.getElementById("logoutButton").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await request("/api/auth/logout", { method: "POST" });
    location.assign("/admin-login.html");
  } catch (error) {
    showMessage(error.message, "danger");
    button.disabled = false;
  }
});

initializeAdmin().catch(error => {
  showMessage(error.message, "danger");
  if (error.message.includes("Sign in")) location.assign("/admin-login.html");
});
