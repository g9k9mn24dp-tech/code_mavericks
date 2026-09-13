
const state = { catalog: { apps: [], games: [] } };

const stripePaymentLinks = {
  // Fastest Stripe setup:
  // "literally-illiterate": "https://buy.stripe.com/...",
  // "steampunk-chronicles": "https://buy.stripe.com/..."
};

const allProducts = () => [...state.catalog.apps, ...state.catalog.games];

async function init(){
  const res = await fetch("/catalog.json");
  state.catalog = await res.json();

  const grid = document.querySelector("#releaseGrid");
  grid.innerHTML = allProducts().map(productCard).join("");
  const projectCount = document.querySelector("#projectCount");
if (projectCount) {
  projectCount.textContent = allProducts().length;
}
const productSelect = document.querySelector("#productSelect");
if (productSelect) {
  allProducts().forEach(product => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    productSelect.appendChild(option);
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();

  const checkout = new URLSearchParams(location.search).get("checkout");
  if(checkout === "success") showToast("Payment complete — thank you!");
  if(checkout === "cancelled") showToast("Checkout cancelled. Nothing was charged.");

  wireEvents();
}

function productCard(p){
  return `<article class="release-card">
   <div class="release-art" style="--a:${p.accent1};--b:${p.accent2}">
  ${
    p.image
      ? `<img src="${p.image}" alt="${p.name}" class="release-image">`
      : `<strong>${p.name}</strong>`
  }
</div>
    <div class="release-body">
      <div class="meta"><span>${p.category}</span><span>${p.status}</span></div>
      <h3>${p.tagline}</h3>
      <p>${p.description}</p>
      <div class="card-footer">
  <strong>${p.price}</strong>

  <div class="card-actions">
    ${p.page ? `<a class="button secondary" href="${p.page}">Learn more</a>` : ""}

    <button class="button secondary detail-button" data-id="${p.id}">
      ${p.url ? "Open App" : "View details"}
    </button>
  </div>
</div>
    </div>
  </article>`;
}

function wireEvents(){
  document.addEventListener("click", (e) => {
    const detail = e.target.closest(".detail-button");

if (detail) {
  const product = allProducts().find(
    p => p.id === detail.dataset.id
  );

  if (product?.url) {
    window.location.href = product.url;
  } else {
    openProduct(detail.dataset.id);
  }
}

    const buy = e.target.closest(".buy-button");
    if(buy) startCheckout(buy.dataset.id);
  });

  const dialog = document.querySelector("#productDialog");
  document.querySelector(".dialog-close").addEventListener("click",()=>dialog.close());

  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  menuBtn.addEventListener("click", ()=>{
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>navLinks.classList.remove("open")));

  document.querySelector("#newsletterForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const email = e.target.querySelector("input").value;
    const ok = await submitForm("/api/newsletter", { email });
    showToast(ok ? "You're on the list." : "Newsletter signup is ready — connect your email provider.");
    if(ok) e.target.reset();
  });

  document.querySelector("#supportForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    const ok = await submitForm("/api/support", payload);
    showToast(ok ? "Support request sent." : "Support form is ready — add your email service settings.");
    if(ok) e.target.reset();
  });

  const cookie = document.querySelector("#cookieBanner");
  if(localStorage.getItem("cm-cookie-ok")) cookie.classList.add("hide");
  document.querySelector("#cookieAccept").addEventListener("click",()=>{
    localStorage.setItem("cm-cookie-ok","1");
    cookie.classList.add("hide");
  });
}

function openProduct(id){
  const p = allProducts().find(x=>x.id===id);
  if(!p) return;
  document.querySelector("#dialogBody").innerHTML = `
    <div class="dialog-head">
      <div>
        <div class="eyebrow">${p.category.toUpperCase()} · ${p.status.toUpperCase()}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
      </div>
    </div>
    <div class="feature-list">${p.features.map(f=>`<span>✓ ${f}</span>`).join("")}</div>
    <div class="buy-row">
  <div><div class="eyebrow">PRICE</div><strong>${p.price}</strong></div>

  ${
    p.status === "Coming Soon"
      ? `<button class="button primary" disabled>Coming Soon</button>`
      : `<button class="button primary buy-button" data-id="${p.id}">
          ${p.url ? "Open App" : (p.price === "Free" ? "Open / Download" : "Buy securely")}
        </button>`
  }
</div>
    </div>`;
  document.querySelector("#productDialog").showModal();
}

async function startCheckout(id){
  const p = allProducts().find(x=>x.id===id);
  if(!p) return;
  if (p.url) {
  window.location.href = p.url;
  return;
}
  if(p.price === "Free"){
    showToast("Add your App Store or web-app URL for this free release.");
    return;
  }
  if(stripePaymentLinks[id]){
    location.href = stripePaymentLinks[id];
    return;
  }
  try{
    const res = await fetch("/api/create-checkout-session", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({productId:id})
    });
    const data = await res.json();
    if(!res.ok || !data.url) throw new Error(data.error || "Checkout unavailable");
    location.href = data.url;
  }catch(err){
    showToast("Stripe checkout needs your Stripe key and Price IDs in .env.");
  }
}

async function submitForm(url, payload){
  try{
    const res = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    return res.ok;
  }catch{ return false; }
}

let toastTimer;
function showToast(msg){
  const t = document.querySelector("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"),3500);
}

init();
