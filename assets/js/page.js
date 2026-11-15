document.addEventListener("DOMContentLoaded", () => {
  // Demo admin content is stored only in this browser.
  const noticeForm = document.getElementById("noticeForm");
  if (noticeForm) {
    const renderNotices = () => {
      const list = JSON.parse(localStorage.getItem("bp_notices") || "[]");
      const target = document.getElementById("adminNotices");
      if (target) target.innerHTML = list.length ? list.map((n,i) => `<div class="list-group-item d-flex justify-content-between align-items-start gap-3"><div><strong>${escapeHtml(n.title)}</strong><div class="small text-secondary">${escapeHtml(n.date)} · ${escapeHtml(n.category)}</div><div>${escapeHtml(n.description)}</div></div><button class="btn btn-sm btn-outline-danger" data-delete-notice="${i}" aria-label="Delete notice"><i class="bi bi-trash"></i></button></div>`).join("") : '<div class="text-secondary p-3">No demo notices added yet.</div>';
    };
    noticeForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!noticeForm.reportValidity()) return;
      const list = JSON.parse(localStorage.getItem("bp_notices") || "[]");
      list.unshift({title: noticeForm.noticeTitle.value, date: noticeForm.noticeDate.value, category: noticeForm.noticeCategory.value, description: noticeForm.noticeDescription.value});
      localStorage.setItem("bp_notices", JSON.stringify(list));
      noticeForm.reset(); renderNotices();
    });
    document.getElementById("adminNotices")?.addEventListener("click", e => {
      const btn = e.target.closest("[data-delete-notice]");
      if (!btn) return;
      const list = JSON.parse(localStorage.getItem("bp_notices") || "[]");
      list.splice(Number(btn.dataset.deleteNotice), 1);
      localStorage.setItem("bp_notices", JSON.stringify(list)); renderNotices();
    });
    renderNotices();
  }

  const galleryModal = document.getElementById("galleryModal");
  if (galleryModal) {
    galleryModal.addEventListener("show.bs.modal", event => {
      const trigger = event.relatedTarget;
      const image = trigger?.querySelector("img");
      const modalImage = galleryModal.querySelector("img");
      if (image && modalImage) { modalImage.src = image.src; modalImage.alt = image.alt; }
    });
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
