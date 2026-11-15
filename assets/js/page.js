document.addEventListener("DOMContentLoaded", () => {
  const galleryModal = document.getElementById("galleryModal");
  if (galleryModal) {
    galleryModal.addEventListener("show.bs.modal", event => {
      const trigger = event.relatedTarget;
      const image = trigger?.querySelector("img");
      const modalImage = galleryModal.querySelector("img");
      if (image && modalImage) { modalImage.src = image.src; modalImage.alt = image.alt; }
      const caption = galleryModal.querySelector("[data-gallery-caption]");
      if (caption) {
        caption.textContent = trigger?.dataset.caption || "";
        caption.hidden = !caption.textContent;
      }
    });
  }
});
