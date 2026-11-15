const loginForm = document.getElementById("loginForm");
const loginAlert = document.getElementById("loginAlert");
let csrfToken = "";

fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
  .then(response => {
    if (response.ok) location.replace("/admin.html");
  })
  .catch(error => console.error("Could not check the current sign-in session:", error.message));

function showLoginError(message) {
  loginAlert.textContent = message;
  loginAlert.className = "alert alert-danger";
}

async function loadCsrfToken() {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not start a secure sign-in session.");
  csrfToken = result.csrfToken;
}

loadCsrfToken().catch(error => showLoginError(error.message));

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    if (!csrfToken) await loadCsrfToken();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Sign-in failed.");
    location.assign("/admin.html");
  } catch (error) {
    showLoginError(error.message);
  } finally {
    submitButton.disabled = false;
  }
});
