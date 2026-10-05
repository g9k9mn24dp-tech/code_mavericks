const state = {
  catalog: {
    apps: [],
    games: []
  }
};

const launchParams = new URLSearchParams(window.location.search);
const dungeonRealmUserId = launchParams.get("user_id");

const stripePaymentLinks = {
  // Optional direct Stripe Payment Links:
  // "literally-illiterate": "https://buy.stripe.com/...",
  // "steampunk-chronicles": "https://buy.stripe.com/..."
};


/* =========================================================
   PRODUCTS
========================================================= */

const allProducts = () => {
  const products = [
    ...(state.catalog.apps || []),
    ...(state.catalog.games || [])
  ];

  const order = [
    "literally-illiterate",
    "dont-do-that",
    "stillspace",
    "dungeon-realm-online",
    "steampunk-chronicles",
    "number-outlaw",
    "utility-lab"
  ];

  return products.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);

    const safeA = aIndex === -1 ? 999 : aIndex;
    const safeB = bIndex === -1 ? 999 : bIndex;

    return safeA - safeB;
  });
};


/* =========================================================
   INITIALISE WEBSITE
========================================================= */

async function init() {
  try {
    /*
      IMPORTANT:
      catalog.json is stored in public/data/catalog.json,
      therefore the browser URL is /data/catalog.json
    */
    const res = await fetch("/data/catalog.json?v=20261005-2", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Catalog failed to load: ${res.status}`);
    }

    state.catalog = await res.json();

    console.log("Code Mavericks catalogue loaded:", state.catalog);

    renderProducts();
    renderProjectCount();
    populateProductSelect();
    updateYear();
    handleCheckoutResult();
    wireEvents();

  } catch (error) {
    console.error("Failed to initialise Code Mavericks:", error);

    const grid = document.querySelector("#releaseGrid");

    if (grid) {
      grid.innerHTML = `
        <div class="catalog-error">
          <h3>Games temporarily unavailable</h3>
          <p>
            We couldn't load the Code Mavericks catalogue.
            Please refresh the page and try again.
          </p>
        </div>
      `;
    }

    /*
      Still wire non-catalogue events so navigation,
      cookies and forms continue working.
    */
    wireEvents();
    updateYear();
  }
}


/* =========================================================
   RENDER CATALOGUE
========================================================= */

function renderProducts() {
  const grid = document.querySelector("#releaseGrid");

  if (!grid) {
    console.warn("#releaseGrid was not found.");
    return;
  }

  const products = allProducts();

  if (!products.length) {
    grid.innerHTML = `
      <div class="catalog-error">
        <h3>More releases coming soon</h3>
        <p>We're currently updating the Code Mavericks catalogue.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products
    .map(productCard)
    .join("");
}


function renderProjectCount() {
  const projectCount = document.querySelector("#projectCount");

  if (projectCount) {
    projectCount.textContent = allProducts().length;
  }
}


function populateProductSelect() {
  const productSelect = document.querySelector("#productSelect");

  if (!productSelect) return;

  productSelect.innerHTML = "";

  allProducts().forEach(product => {
    const option = document.createElement("option");

    option.value = product.id;
    option.textContent = product.name;

    productSelect.appendChild(option);
  });
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function productCard(p) {
  const accent1 = p.accent1 || "#18d9ff";
  const accent2 = p.accent2 || "#7a49ff";

  const artwork = p.image
    ? `
      <img
        src="${escapeHtml(p.image)}"
        alt="${escapeHtml(p.name)}"
        class="release-image"
        loading="lazy"
      >
    `
    : `
      <strong>${escapeHtml(p.name)}</strong>
    `;

  const learnMore = p.page
    ? `
      <a
        class="button secondary"
        href="${escapeHtml(p.page)}"
      >
        Learn more
      </a>
    `
    : "";

  const actionText = p.url
    ? "Open App"
    : "View details";

  return `
    <article class="release-card">

      <div
        class="release-art"
        style="--a:${accent1};--b:${accent2}"
      >
        ${artwork}
      </div>

      <div class="release-body">

        <div class="meta">
          <span>${escapeHtml(p.category || "")}</span>
          <span>${escapeHtml(p.status || "")}</span>
        </div>

        <h3>${escapeHtml(p.name || "")}</h3>

        <h4>${escapeHtml(p.tagline || "")}</h4>

        <p>${escapeHtml(p.description || "")}</p>

        <div class="card-footer">

          <strong>${escapeHtml(p.price || "")}</strong>

          <div class="card-actions">

            ${learnMore}

            <button
              class="button secondary detail-button"
              data-id="${escapeHtml(p.id)}"
              type="button"
            >
              ${actionText}
            </button>

          </div>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   EVENTS
========================================================= */

function wireEvents() {
  /*
    Use one global click listener.
    Guard against duplicate registration.
  */

  if (!document.body.dataset.cmEventsWired) {
    document.body.dataset.cmEventsWired = "1";

    document.addEventListener("click", event => {

      /* Product details / App Store button */
      const detail = event.target.closest(".detail-button");

      if (detail) {
        const product = allProducts().find(
          p => p.id === detail.dataset.id
        );

        if (!product) return;

        if (product.url) {
          trackAppStoreClick(product);

          window.location.href = product.url;
          return;
        }

        openProduct(product.id);
        return;
      }


      /* Buy button inside modal */
      const buy = event.target.closest(".buy-button");

      if (buy) {
        startCheckout(buy.dataset.id);
        return;
      }


      /* Cookie banner */
      if (event.target.closest("#cookieAccept")) {
        localStorage.setItem("cm-cookie-ok", "1");

        const cookie = document.querySelector("#cookieBanner");

        if (cookie) {
          cookie.classList.add("hide");
        }

        return;
      }
    });
  }


  /* Product dialog */
  const dialog = document.querySelector("#productDialog");
  const dialogClose = document.querySelector(".dialog-close");

  if (dialog && dialogClose && !dialogClose.dataset.wired) {
    dialogClose.dataset.wired = "1";

    dialogClose.addEventListener("click", () => {
      dialog.close();
    });
  }


  /* Mobile menu */
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (
    menuBtn &&
    navLinks &&
    !menuBtn.dataset.wired
  ) {
    menuBtn.dataset.wired = "1";

    menuBtn.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");

      menuBtn.setAttribute(
        "aria-expanded",
        String(open)
      );
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }


  /* Newsletter */
  const newsletterForm =
    document.querySelector("#newsletterForm");

  if (
    newsletterForm &&
    !newsletterForm.dataset.wired
  ) {
    newsletterForm.dataset.wired = "1";

    newsletterForm.addEventListener(
      "submit",
      handleNewsletterSubmit
    );
  }


  /* Support form */
  const supportForm =
    document.querySelector("#supportForm");

  if (
    supportForm &&
    !supportForm.dataset.wired
  ) {
    supportForm.dataset.wired = "1";

    supportForm.addEventListener(
      "submit",
      handleSupportSubmit
    );
  }


  /* Cookie state */
  const cookie =
    document.querySelector("#cookieBanner");

  if (
    cookie &&
    localStorage.getItem("cm-cookie-ok")
  ) {
    cookie.classList.add("hide");
  }
}


/* =========================================================
   NEWSLETTER
========================================================= */

async function handleNewsletterSubmit(event) {
  event.preventDefault();

  const input =
    event.target.querySelector('input[type="email"]') ||
    event.target.querySelector("input");

  if (!input) return;

  const email = input.value.trim();

  if (!email) {
    showToast("Enter your email address.");
    return;
  }

  const ok = await submitForm(
    "/api/newsletter",
    { email }
  );

  showToast(
    ok
      ? "You're on the list."
      : "Newsletter signup is temporarily unavailable."
  );

  if (ok) {
    event.target.reset();
  }
}


/* =========================================================
   SUPPORT FORM
========================================================= */

async function handleSupportSubmit(event) {
  event.preventDefault();

  const payload =
    Object.fromEntries(
      new FormData(event.target).entries()
    );

  const ok = await submitForm(
    "/api/support",
    payload
  );

  showToast(
    ok
      ? "Support request sent."
      : "We couldn't send the request. Please email Code Mavericks support."
  );

  if (ok) {
    event.target.reset();
  }
}


/* =========================================================
   PRODUCT DIALOG
========================================================= */

function openProduct(id) {
  const p = allProducts().find(
    product => product.id === id
  );

  if (!p) return;

  const dialog =
    document.querySelector("#productDialog");

  const body =
    document.querySelector("#dialogBody");

  if (!dialog || !body) return;

  const features = Array.isArray(p.features)
    ? p.features
    : [];

  let actionButton = "";

  if (p.status === "Coming Soon") {
    actionButton = `
      <button
        class="button primary"
        disabled
      >
        Coming Soon
      </button>
    `;
  } else {
    const label = p.url
      ? "Open App"
      : p.price === "Free"
        ? "Open / Download"
        : "Buy securely";

    actionButton = `
      <button
        class="button primary buy-button"
        data-id="${escapeHtml(p.id)}"
        type="button"
      >
        ${label}
      </button>
    `;
  }

  body.innerHTML = `
    <div class="dialog-head">

      <div>
        <div class="eyebrow">
          ${escapeHtml(
            (p.category || "").toUpperCase()
          )}
          ·
          ${escapeHtml(
            (p.status || "").toUpperCase()
          )}
        </div>

        <h3>${escapeHtml(p.name || "")}</h3>

        <p>
          ${escapeHtml(p.description || "")}
        </p>
      </div>

    </div>

    <div class="feature-list">
      ${features
        .map(feature => `
          <span>✓ ${escapeHtml(feature)}</span>
        `)
        .join("")}
    </div>

    <div class="buy-row">

      <div>
        <div class="eyebrow">PRICE</div>
        <strong>
          ${escapeHtml(p.price || "")}
        </strong>
      </div>

      ${actionButton}

    </div>
  `;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
}


/* =========================================================
   CHECKOUT
========================================================= */

async function startCheckout(id) {
  const product = allProducts().find(
    p => p.id === id
  );

  if (!product) return;


  /*
    Free products or products with an external URL
  */
  if (product.url) {
    trackAppStoreClick(product);

    window.location.href = product.url;
    return;
  }


  /*
    Free item but no URL
  */
  if (product.price === "Free") {
    showToast(
      "This release does not currently have a download link."
    );

    return;
  }


  /*
    Direct Stripe Payment Link
  */
  if (stripePaymentLinks[id]) {
    window.location.href =
      stripePaymentLinks[id];

    return;
  }


  /*
    Server-created Stripe Checkout session
  */
  try {
    const payload = {
      productId: id
    };


    /*
      Dungeon Realm requires logged-in Base44 user id
    */
    if (id === "dungeon-realm-online") {

      if (!dungeonRealmUserId) {
        showToast(
          "Please sign in to Dungeon Realm before purchasing."
        );

        return;
      }

      payload.userId =
        dungeonRealmUserId;
    }


    const res = await fetch(
      "/api/create-checkout-session",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(payload)
      }
    );


    const data = await res.json();


    if (!res.ok || !data.url) {
      throw new Error(
        data.error ||
        "Checkout unavailable"
      );
    }


    window.location.href = data.url;

  } catch (error) {
    console.error(
      "Checkout failed:",
      error
    );

    showToast(
      "Checkout is temporarily unavailable."
    );
  }
}


/* =========================================================
   FORM SUBMISSION
========================================================= */

async function submitForm(url, payload) {
  try {
    const res = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

    return res.ok;

  } catch (error) {
    console.error(
      `Form submission failed: ${url}`,
      error
    );

    return false;
  }
}


/* =========================================================
   APP STORE ANALYTICS
========================================================= */

function trackAppStoreClick(product) {
  if (!product?.url) return;

  if (
    product.url.includes(
      "apps.apple.com"
    )
  ) {
    console.log(
      "App Store click:",
      product.id,
      product.url
    );

    if (
      typeof window.gtag ===
      "function"
    ) {
      window.gtag(
        "event",
        "app_store_click",
        {
          app_name: product.name,
          product_id: product.id,
          destination_url:
            product.url
        }
      );
    }
  }
}


/* =========================================================
   CHECKOUT RETURN MESSAGE
========================================================= */

function handleCheckoutResult() {
  const checkout =
    new URLSearchParams(
      window.location.search
    ).get("checkout");

  if (checkout === "success") {
    showToast(
      "Payment complete — thank you!"
    );
  }

  if (checkout === "cancelled") {
    showToast(
      "Checkout cancelled. Nothing was charged."
    );
  }
}


/* =========================================================
   FOOTER YEAR
========================================================= */

function updateYear() {
  const year =
    document.querySelector("#year");

  if (year) {
    year.textContent =
      new Date().getFullYear();
  }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {
  const toast =
    document.querySelector("#toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => {
      toast.classList.remove("show");
    },
    3500
  );
}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   START
========================================================= */

init();
