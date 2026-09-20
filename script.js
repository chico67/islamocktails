/* ============================================================
   PRODUCT DATA
   ------------------------------------------------------------
   colors3d drives the real-time WebGL cup (liquid gradient,
   garnish, straw). Edit prices/copy any time.
   ============================================================ */
const PRODUCTS = [
  {
    id: "isla-sol",
    lines: ["Isla", "Sol"],
    headline: ["SUNNY MANGO TASTE", "WITH A ZESTY CITRUS TWIST", "IN EVERY CUP"],
    desc: "Fresh mango, zesty lemon, Yakult, and Sprite.",
    calloutLeft: "FRESH MANGO<br>WITH ZESTY LEMON",
    ingredients: ["Mango", "Lemon", "Yakult", "Sprite"],
    img: "assets/isla-sol-cutout.webp",
    price: 120,
    bg1: "#FBD087", bg2: "#F3963A", glow: "#FFE1A3",
    colors3d: { liquidBottom: 0xF6B93B, liquidTop: 0xFBD98A, garnish: 0xEFD22E, straw: 0xFFFFFF }
  },
  {
    id: "veranda-splitz",
    lines: ["Veranda", "Splitz"],
    headline: ["BREEZY MELON TASTE", "WITH A SPARKLING CITRUS TWIST", "IN EVERY CUP"],
    desc: "Juicy melon, sweet dalandan, and Sprite.",
    calloutLeft: "JUICY MELON<br>WITH SWEET DALANDAN",
    ingredients: ["Melon", "Dalandan", "Sprite"],
    img: "assets/veranda-splitz-cutout.webp",
    price: 120,
    bg1: "#D9E9A0", bg2: "#7CB349", glow: "#E7F3B8",
    colors3d: { liquidBottom: 0xBFD65E, liquidTop: 0xE1EC9E, garnish: 0xF08A3C, straw: 0xFFFFFF }
  },
  {
    id: "el-nido-nectar",
    lines: ["El Nido", "Nectar"],
    headline: ["GOLDEN CALAMANSI TASTE", "WITH AN EARTHY HONEY TWIST", "IN EVERY CUP"],
    desc: "Calamansi, turmeric, honey, and coconut water.",
    calloutLeft: "CALAMANSI & HONEY<br>WITH TURMERIC",
    ingredients: ["Calamansi", "Turmeric", "Honey", "Coconut Water"],
    img: "assets/el-nido-nectar-cutout.webp",
    price: 130,
    bg1: "#F7C873", bg2: "#C97B2E", glow: "#FFE1A3",
    colors3d: { liquidBottom: 0xDE9A2E, liquidTop: 0xF0C066, garnish: 0xB7CE3E, straw: 0xEFDFC0 }
  },
  {
    id: "santorini-sunset",
    lines: ["Santorini", "Sunset"],
    headline: ["SUNSET WATERMELON TASTE", "WITH A COCONUT LIME TWIST", "IN EVERY CUP"],
    desc: "Watermelon, orange, Sprite, and coconut water.",
    calloutLeft: "WATERMELON & ORANGE<br>WITH COCONUT WATER",
    ingredients: ["Watermelon", "Orange", "Sprite", "Coconut Water"],
    img: "assets/santorini-sunset-cutout.webp",
    price: 130,
    bg1: "#FFA98F", bg2: "#D8446E", glow: "#FFC9B0",
    colors3d: { liquidBottom: 0xE14C4C, liquidTop: 0xFFB37A, garnish: 0xF5822E, straw: 0xFFFFFF }
  }
];

const PESO = n => "₱" + n.toLocaleString("en-PH");

/* ============================================================
   GOOGLE SHEETS CONFIG
   ------------------------------------------------------------
   1. Create a Google Sheet with columns: Timestamp | Name | Phone | Items | Total
   2. Extensions -> Apps Script, paste a doPost(e) function that
      reads e.parameter and appends a row to the sheet.
   3. Deploy -> New deployment -> Web app -> Execute as: Me,
      Who has access: Anyone. Copy the /exec URL below.
   ============================================================ */
const CONFIG = {
  GOOGLE_SHEETS_URL: "https://script.google.com/macros/s/AKfycbwqaIPQcLJ81gJPwXyPvxx5wtvDBprOfCsB_kvDwL1kenQ0oDObRF8KdL54zWBXNBJg/exec" // <-- paste your Apps Script Web App URL here
};

/* ============================================================
   STATE
   ============================================================ */
const cart = {};
let activeIndex = 0;
let webglOK = false;

/* ============================================================
   ============  REAL-TIME 3D MOCKTAIL SCENE  =================
   ============================================================ */
const three = {
  renderer: null, scene: null, camera: null,
  tiltGroup: null, spinGroup: null,
  liquidBottomMat: null, liquidTopMat: null, garnishMat: null, strawMat: null,
  iceMeshes: [], iceBaseY: [],
  idleAngle: 0,
  targetTiltX: 0, targetTiltZ: 0, curTiltX: 0, curTiltZ: 0,
  scrollSpin: 0, lastScrollY: 0,
  popScale: 1, popTarget: 1,
  tween: null // {fromB,toB,fromT,toT,fromG,toG,fromS,toS,start}
};

function hasWebGL(){
  try{
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch(e){ return false; }
}

function buildCup(){
  const g = three.spinGroup;

  // --- cup wall (open-ended tapered cylinder) ---
  const cupGeo = new THREE.CylinderGeometry(0.60, 0.48, 1.65, 40, 1, true);
  const cupMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.22,
    roughness: 0.12, metalness: 0, side: THREE.DoubleSide,
    clearcoat: 0.4, transmission: 0.5, thickness: 0.3
  });
  const cupMesh = new THREE.Mesh(cupGeo, cupMat);
  cupMesh.castShadow = true;
  g.add(cupMesh);

  // base
  const baseGeo = new THREE.CircleGeometry(0.48, 40);
  const baseMesh = new THREE.Mesh(baseGeo, cupMat);
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.y = -0.825;
  g.add(baseMesh);

  // rim highlight
  const rimGeo = new THREE.TorusGeometry(0.605, 0.016, 10, 40);
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.1 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.825;
  g.add(rimMesh);

  // --- liquid (two-tone: bottom + top slice, lets Santorini Sunset gradient) ---
  three.liquidBottomMat = new THREE.MeshPhysicalMaterial({ color: 0xF6B93B, transparent: true, opacity: 0.9, roughness: 0.25, metalness: 0.05 });
  three.liquidTopMat = new THREE.MeshPhysicalMaterial({ color: 0xFBD98A, transparent: true, opacity: 0.9, roughness: 0.2, metalness: 0.05 });

  const liqBottomGeo = new THREE.CylinderGeometry(0.505, 0.46, 0.9, 40);
  const liqBottomMesh = new THREE.Mesh(liqBottomGeo, three.liquidBottomMat);
  liqBottomMesh.position.y = -0.35;
  liqBottomMesh.castShadow = true;
  g.add(liqBottomMesh);

  const liqTopGeo = new THREE.CylinderGeometry(0.525, 0.505, 0.32, 40);
  const liqTopMesh = new THREE.Mesh(liqTopGeo, three.liquidTopMat);
  liqTopMesh.position.y = 0.26;
  liqTopMesh.castShadow = true;
  g.add(liqTopMesh);

  // --- ice chunks ---
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xEAF6FF, transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0, clearcoat: 0.6 });
  const icePositions = [
    [0.18, 0.32, 0.10], [-0.20, 0.40, -0.08], [0.02, 0.46, -0.22],
    [-0.10, 0.28, 0.22], [0.24, 0.44, -0.05]
  ];
  icePositions.forEach((p, i) => {
    const size = 0.13 + (i % 2) * 0.02;
    const iceGeo = new THREE.DodecahedronGeometry(size, 0);
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(p[0], p[1], p[2]);
    ice.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    ice.castShadow = true;
    g.add(ice);
    three.iceMeshes.push(ice);
    three.iceBaseY.push(p[1]);
  });

  // --- garnish wheel resting on the rim ---
  three.garnishMat = new THREE.MeshPhysicalMaterial({ color: 0xEFD22E, roughness: 0.45, metalness: 0, side: THREE.DoubleSide });
  const garnishGeo = new THREE.TorusGeometry(0.24, 0.045, 12, 28);
  const garnishMesh = new THREE.Mesh(garnishGeo, three.garnishMat);
  garnishMesh.scale.set(1, 1, 0.4);
  garnishMesh.rotation.x = Math.PI / 2.4;
  garnishMesh.position.set(0.30, 0.86, 0.10);
  garnishMesh.castShadow = true;
  g.add(garnishMesh);
  const garnishCoreGeo = new THREE.CircleGeometry(0.2, 24);
  const garnishCoreMesh = new THREE.Mesh(garnishCoreGeo, three.garnishMat);
  garnishCoreMesh.rotation.x = Math.PI / 2.4;
  garnishCoreMesh.position.set(0.30, 0.855, 0.10);
  g.add(garnishCoreMesh);

  // --- straw ---
  three.strawMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0 });
  const strawGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.7, 12);
  const strawMesh = new THREE.Mesh(strawGeo, three.strawMat);
  strawMesh.position.set(-0.16, 0.55, -0.05);
  strawMesh.rotation.z = THREE.MathUtils.degToRad(16);
  strawMesh.castShadow = true;
  g.add(strawMesh);
}

function resizeThreeCanvas(){
  if (!three.renderer) return;
  const canvas = document.getElementById("heroCanvas");
  const container = canvas.parentElement;
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  three.renderer.setSize(w, h, false);
  three.camera.aspect = w / h;
  three.camera.updateProjectionMatrix();
}

function initThree(){
  if (!hasWebGL() || typeof THREE === "undefined") return false;
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return false;

  try{
    three.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    three.renderer.shadowMap.enabled = true;
    three.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    three.scene = new THREE.Scene();
    three.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    three.camera.position.set(0, 0.2, 4.6);
    three.camera.lookAt(0, 0, 0);

    three.scene.add(new THREE.AmbientLight(0xfff3e0, 0.65));

    const key = new THREE.DirectionalLight(0xffe9c4, 1.05);
    key.position.set(2.2, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 10;
    key.shadow.camera.left = -2; key.shadow.camera.right = 2;
    key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
    three.scene.add(key);

    const rim = new THREE.DirectionalLight(0xff9d6e, 0.75);
    rim.position.set(-2.4, 1.2, -2.0);
    three.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xbfe9ff, 0.22);
    fill.position.set(-1, -1, 2);
    three.scene.add(fill);

    const groundGeo = new THREE.PlaneGeometry(6, 6);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.95;
    ground.receiveShadow = true;
    three.scene.add(ground);

    three.tiltGroup = new THREE.Group();
    three.tiltGroup.rotation.z = THREE.MathUtils.degToRad(-12);
    three.scene.add(three.tiltGroup);
    three.spinGroup = new THREE.Group();
    three.tiltGroup.add(three.spinGroup);

    buildCup();
    resizeThreeCanvas();
    window.addEventListener("resize", resizeThreeCanvas);
    if (window.ResizeObserver) {
      new ResizeObserver(resizeThreeCanvas).observe(canvas.parentElement);
    }

    requestAnimationFrame(animateThree);
    return true;
  } catch(e){
    console.warn("3D scene failed to initialize, falling back to static image.", e);
    return false;
  }
}

function animateThree(now){
  requestAnimationFrame(animateThree);
  if (!three.renderer) return;

  three.idleAngle += 0.0032;
  three.curTiltX += (three.targetTiltX - three.curTiltX) * 0.07;
  three.curTiltZ += (three.targetTiltZ - three.curTiltZ) * 0.07;
  three.popScale += (three.popTarget - three.popScale) * 0.16;

  three.spinGroup.rotation.y = three.idleAngle + three.scrollSpin;
  three.spinGroup.rotation.x = three.curTiltX;
  three.spinGroup.scale.set(three.popScale, three.popScale, three.popScale);
  three.tiltGroup.rotation.z = THREE.MathUtils.degToRad(-12) + three.curTiltZ;

  three.iceMeshes.forEach((m, i) => {
    m.position.y = three.iceBaseY[i] + Math.sin(now * 0.0012 + i * 1.3) * 0.025;
    m.rotation.y += 0.003;
  });

  if (three.tween){
    const t = Math.min(1, (performance.now() - three.tween.start) / 700);
    const ease = 1 - Math.pow(1 - t, 3);
    three.liquidBottomMat.color.copy(three.tween.fromB).lerp(three.tween.toB, ease);
    three.liquidTopMat.color.copy(three.tween.fromT).lerp(three.tween.toT, ease);
    three.garnishMat.color.copy(three.tween.fromG).lerp(three.tween.toG, ease);
    three.strawMat.color.copy(three.tween.fromS).lerp(three.tween.toS, ease);
    if (t >= 1) three.tween = null;
  }

  three.renderer.render(three.scene, three.camera);
}

function apply3DProduct(p){
  const c = p.colors3d;
  three.tween = {
    fromB: three.liquidBottomMat.color.clone(), toB: new THREE.Color(c.liquidBottom),
    fromT: three.liquidTopMat.color.clone(), toT: new THREE.Color(c.liquidTop),
    fromG: three.garnishMat.color.clone(), toG: new THREE.Color(c.garnish),
    fromS: three.strawMat.color.clone(), toS: new THREE.Color(c.straw),
    start: performance.now()
  };
  three.popTarget = 1.1;
  setTimeout(() => { three.popTarget = 1; }, 200);
}

function initInteraction(){
  const productEl = document.getElementById("hsProduct");
  if (!productEl) return;

  productEl.addEventListener("mousemove", (e) => {
    const rect = productEl.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    three.targetTiltX = ny * 0.18;
    three.targetTiltZ = nx * -0.14;
  });
  productEl.addEventListener("mouseleave", () => { three.targetTiltX = 0; three.targetTiltZ = 0; });
  productEl.addEventListener("touchmove", (e) => {
    const t = e.touches[0]; if (!t) return;
    const rect = productEl.getBoundingClientRect();
    const nx = ((t.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((t.clientY - rect.top) / rect.height) * 2 - 1;
    three.targetTiltX = ny * 0.15; three.targetTiltZ = nx * -0.1;
  }, { passive: true });

  three.lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const delta = y - three.lastScrollY;
    three.scrollSpin += delta * 0.006;
    three.lastScrollY = y;

    const heroEl = document.getElementById("top");
    if (heroEl && three.tiltGroup){
      const rect = heroEl.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
      three.tiltGroup.position.y = progress * 0.55;
    }
  }, { passive: true });
}

/* ============================================================
   SHOWCASE (text / theme / cart) — shared by 3D and fallback paths
   ============================================================ */
const els = {
  bg: document.getElementById("hsBg"),
  glow: document.getElementById("hsGlow"),
  headline: document.getElementById("hsHeadline"),
  calloutLeft: document.getElementById("calloutLeft"),
  price: document.getElementById("hsPrice"),
  addBtn: document.getElementById("hsAddBtn"),
  switcher: document.getElementById("hsSwitcher"),
  fallbackImg: document.getElementById("hsImgFallback")
};

function renderSwitcher(){
  els.switcher.innerHTML = PRODUCTS.map((p, i) => `
    <button type="button" class="flavor-thumb ${i === activeIndex ? "is-active" : ""}" data-index="${i}" aria-label="${p.lines.join(' ')}">
      <img src="${p.img}" alt="${p.lines.join(' ')}">
    </button>
  `).join("");
  els.switcher.querySelectorAll(".flavor-thumb").forEach(btn => {
    btn.addEventListener("click", () => setActive(parseInt(btn.dataset.index, 10)));
  });
}

function updateAddButton(){
  const p = PRODUCTS[activeIndex];
  const inCart = !!cart[p.id];
  els.addBtn.classList.toggle("is-added", inCart);
  els.addBtn.querySelector("span").textContent = inCart ? "Added to order" : "Add to order";
}

function setActive(index){
  activeIndex = ((index % PRODUCTS.length) + PRODUCTS.length) % PRODUCTS.length;
  const p = PRODUCTS[activeIndex];

  document.documentElement.style.setProperty("--prod-1", p.bg1);
  document.documentElement.style.setProperty("--prod-2", p.bg2);
  document.documentElement.style.setProperty("--prod-glow", p.glow);

  els.headline.innerHTML = p.headline.map(line => `<span>${line}</span>`).join("");
  els.calloutLeft.querySelector("span").innerHTML = p.calloutLeft;
  els.price.innerHTML = `${PESO(p.price)}<small>per cup</small>`;
  updateAddButton();

  if (webglOK){
    apply3DProduct(p);
  } else if (els.fallbackImg) {
    els.fallbackImg.style.transition = "opacity .3s ease";
    els.fallbackImg.style.opacity = "0";
    setTimeout(() => {
      els.fallbackImg.src = p.img;
      els.fallbackImg.alt = `${p.lines.join(" ")} mocktail`;
      els.fallbackImg.style.opacity = "1";
    }, 260);
  }

  els.switcher.querySelectorAll(".flavor-thumb").forEach((btn, i) => btn.classList.toggle("is-active", i === activeIndex));
}

els.addBtn.addEventListener("click", () => {
  const p = PRODUCTS[activeIndex];
  if (cart[p.id]) delete cart[p.id];
  else cart[p.id] = 1;
  updateAddButton();
  syncCartUI();
});

/* ============================================================
   CART
   ============================================================ */
function cartCount(){ return Object.values(cart).reduce((a, b) => a + b, 0); }
function cartItems(){ return Object.entries(cart).map(([id, qty]) => ({ product: PRODUCTS.find(p => p.id === id), qty })); }
function cartTotal(){ return cartItems().reduce((sum, i) => sum + i.product.price * i.qty, 0); }

function syncCartUI(){
  const count = cartCount();
  document.getElementById("navCartCount").textContent = count;

  const tray = document.getElementById("orderTray");
  const chips = document.getElementById("trayChips");
  const trayCount = document.getElementById("trayCount");
  const trayTotal = document.getElementById("trayTotal");

  if (count > 0){
    tray.classList.add("visible");
    chips.innerHTML = cartItems().map(i => `<img class="chip-thumb" src="${i.product.img}" alt="${i.product.lines.join(' ')}">`).join("");
    trayCount.textContent = `${count} drink${count > 1 ? "s" : ""} selected`;
    trayTotal.textContent = PESO(cartTotal());
  } else {
    tray.classList.remove("visible");
  }
}

/* ============================================================
   MODAL / CHECKOUT
   ============================================================ */
const overlay = document.getElementById("modalOverlay");
const orderList = document.getElementById("orderList");
const orderTotalRow = document.getElementById("orderTotal");
const checkoutForm = document.getElementById("checkoutForm");
const emptyCartMsg = document.getElementById("emptyCartMsg");
const successState = document.getElementById("successState");

function openModal(){
  successState.classList.remove("show");
  checkoutForm.classList.remove("hide");
  document.getElementById("formStatus").textContent = "";

  const items = cartItems();
  if (items.length === 0){
    orderList.style.display = "none";
    orderTotalRow.style.display = "none";
    checkoutForm.style.display = "none";
    emptyCartMsg.style.display = "block";
  } else {
    orderList.style.display = "flex";
    orderTotalRow.style.display = "flex";
    checkoutForm.style.display = "block";
    emptyCartMsg.style.display = "none";
    orderList.innerHTML = items.map(i => `
      <div class="order-row">
        <img src="${i.product.img}" alt="${i.product.lines.join(' ')}">
        <div class="info"><strong>${i.product.lines.join(' ')}</strong><span>Qty ${i.qty} · ${PESO(i.product.price)} each</span></div>
        <div class="line-price">${PESO(i.product.price * i.qty)}</div>
      </div>
    `).join("");
    document.getElementById("orderTotalPrice").textContent = PESO(cartTotal());
  }

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("navCartBtn").addEventListener("click", openModal);
document.getElementById("orderNowBtn").addEventListener("click", () => {
  const p = PRODUCTS[activeIndex];
  if (!cart[p.id]) { cart[p.id] = 1; updateAddButton(); syncCartUI(); }
  openModal();
});
document.getElementById("sideTabBtn").addEventListener("click", openModal);
document.getElementById("drawerOrderBtn").addEventListener("click", () => { closeDrawer(); openModal(); });
document.getElementById("modalClose").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.getElementById("successCloseBtn").addEventListener("click", closeModal);

function isValidPHPhone(v){
  const cleaned = v.replace(/[\s-]/g, "");
  return /^(\+63|0)9\d{9}$/.test(cleaned);
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameField = document.getElementById("nameField");
  const phoneField = document.getElementById("phoneField");
  const nameInput = document.getElementById("custName");
  const phoneInput = document.getElementById("custPhone");
  const submitBtn = document.getElementById("submitBtn");
  const status = document.getElementById("formStatus");

  let valid = true;
  if (!nameInput.value.trim()){ nameField.classList.add("invalid"); valid = false; } else nameField.classList.remove("invalid");
  if (!isValidPHPhone(phoneInput.value)){ phoneField.classList.add("invalid"); valid = false; } else phoneField.classList.remove("invalid");
  if (!valid) return;

  submitBtn.disabled = true;
  status.textContent = "Sending your order…";

  const items = cartItems();
  const payload = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    items: items.map(i => `${i.product.lines.join(' ')} x${i.qty}`).join(", "),
    total: cartTotal(),
    timestamp: new Date().toISOString()
  };

  try {
    if (CONFIG.GOOGLE_SHEETS_URL){
      const form = new URLSearchParams(payload);
      await fetch(CONFIG.GOOGLE_SHEETS_URL, { method: "POST", mode: "no-cors", body: form });
    } else {
      const saved = JSON.parse(localStorage.getItem("isla_orders") || "[]");
      saved.push(payload);
      localStorage.setItem("isla_orders", JSON.stringify(saved));
      console.info("Isla order (saved locally — add CONFIG.GOOGLE_SHEETS_URL to send to Sheets):", payload);
    }

    document.getElementById("successDetail").textContent =
      `Thanks, ${payload.name.split(" ")[0]}! We'll text ${payload.phone} shortly to confirm.`;
    checkoutForm.classList.add("hide");
    checkoutForm.style.display = "none";
    successState.classList.add("show");

    Object.keys(cart).forEach(k => delete cart[k]);
    updateAddButton();
    syncCartUI();
    nameInput.value = ""; phoneInput.value = "";
  } catch (err){
    status.textContent = "Something went wrong — please try again.";
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});

/* ============================================================
   NAV DRAWER (hamburger)
   ============================================================ */
const drawer = document.getElementById("navDrawer");
function closeDrawer(){ drawer.classList.remove("open"); }
document.getElementById("hamburgerBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  drawer.classList.toggle("open");
});
document.addEventListener("click", (e) => {
  if (drawer.classList.contains("open") && !drawer.contains(e.target)) closeDrawer();
});
drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", closeDrawer));

/* reveal-on-scroll */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) en.target.classList.add("in"); });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* ============================================================
   AUDIO — play / pause
   ============================================================ */
const bgm = document.getElementById("bgm");
const soundBtn = document.getElementById("soundToggle");
let userPaused = false;

function tryPlay(){
  if (userPaused) return;
  const p = bgm.play();
  if (p !== undefined){
    p.then(() => soundBtn.classList.add("playing"))
     .catch(() => { soundBtn.classList.remove("playing"); });
  }
}
soundBtn.addEventListener("click", () => {
  if (bgm.paused){ userPaused = false; tryPlay(); }
  else { bgm.pause(); userPaused = true; soundBtn.classList.remove("playing"); }
});
window.addEventListener("load", tryPlay);
["click", "touchstart", "keydown"].forEach(evt => {
  window.addEventListener(evt, function onceInteract(){
    if (!userPaused && bgm.paused) tryPlay();
  }, { once: true });
});

/* ============================================================
   INIT
   ============================================================ */
webglOK = initThree();
if (webglOK) {
  initInteraction();
} else if (els.fallbackImg) {
  const canvasEl = document.getElementById("heroCanvas");
  if (canvasEl) canvasEl.style.display = "none";
  els.fallbackImg.classList.add("show");
}
renderSwitcher();
setActive(0);
syncCartUI();
