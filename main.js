let products = [];
let currentResults = [];
let hasSearched = false;

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setShopUrlParams(term = "", category = "") {
  const url = new URL(window.location.href);
  const t = String(term || "").trim();
  const c = String(category || "").trim();

  if (t) url.searchParams.set("search", t);
  else url.searchParams.delete("search");

  if (c) url.searchParams.set("category", c);
  else url.searchParams.delete("category");

  const qs = url.searchParams.toString();
  history.replaceState(
    null,
    "",
    url.pathname + (qs ? `?${qs}` : "") + url.hash
  );
}

function openMenu() {
  document.body.classList.add("menu--open");
}
function closeMenu() {
  document.body.classList.remove("menu--open");
}

const skeleton = document.querySelector(".results__skeleton");
const resultsMessage = document.querySelector(".results__empty");
const errorState = document.querySelector(".results__error");

const MIN_SKELETON_MS = 650;
let latestSearchRunId = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setShopControlsState(state) {
  const container = document.getElementById("search__container");
  if (!container) return;

  container.classList.toggle("is-loading", state === "loading");
  container.classList.toggle("is-empty", state === "empty");
}

function setResultsMessage(text) {
  if (!resultsMessage) return;
  resultsMessage.textContent = text || "";
  resultsMessage.hidden = !text;
}

function showSkeletonOnly() {
  if (skeleton) skeleton.classList.remove("hidden");
}
function hideSkeletonOnly() {
  if (skeleton) skeleton.classList.add("hidden");
}

function showError(message) {
  if (errorState) {
    errorState.hidden = false;
    errorState.textContent = message;
  }
}
function hideError() {
  if (errorState) {
    errorState.hidden = true;
    errorState.textContent = "";
  }
}

let productsLoadPromise = null;

async function loadProducts() {
  if (Array.isArray(products) && products.length) return products;

  if (productsLoadPromise) return productsLoadPromise;

  productsLoadPromise = (async () => {
    const res = await fetch("https://fakestoreapi.com/products");
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    products = Array.isArray(data) ? data : [];
    return products;
  })();

  try {
    return await productsLoadPromise;
  } finally {
    productsLoadPromise = null;
  }
}

function ratingStars(rate = 0, count = 0) {
  const safeRate = Math.max(0, Math.min(5, Number(rate) || 0));
  const reviewCount = Number(count) || 0;

  const fullStars = Math.floor(rate);
  const hasHalf = rate % 1 > 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const full = `<i class="fa-solid fa-star" aria-hidden="true"></i>`.repeat(
    fullStars
  );
  const half = hasHalf
    ? '<i class="fa-solid fa-star-half" aria-hidden="true"></i>'
    : "";
  const empty = '<i class="fa-regular fa-star" aria-hidden="true"></i>'.repeat(
    emptyStars
  );

  return `
    <span class="product-card__rating"
          aria-label="Rated ${safeRate} out of 5 based on ${reviewCount} reviews">
      ${full}${half}${empty}
      <span class="product-card__rating-count">(${reviewCount})</span>
    </span>`;
}

function renderProducts(list) {
  const resultsGrid = document.querySelector(".results__grid");
  if (!resultsGrid) return;

  const html = (Array.isArray(list) ? list : [])
    .map(
      (p) => `
    <li class="product__card">
      <img src="${p.image}" alt="${p.title}" />
      <div class="product__card--body">
        <h3>${p.title}</h3>
        <p class="product__card--price">$${p.price.toFixed(2)}</p>
        <p>${ratingStars(p.rating?.rate, p.rating?.count)}</p>
      </div>
    </li>`
    )
    .join("");

  resultsGrid.innerHTML = html;
}

function toTitleCaseCategory(value = "") {
  return value
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function getCategoryOptions() {
  const filterSelect = document.getElementById("filterSelect");
  if (!filterSelect) return [];

  return Array.from(filterSelect.options)
    .map((opt) => opt.value)
    .filter((v) => v && v.trim().length);
}

function pickOnePerCategory(source = [], categories = []) {
  return categories
    .map((cat) => {
      const bestInCategory = [...source]
        .filter((p) => (p.category || "").toLowerCase() === cat.toLowerCase())
        .sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0))[0];

      return bestInCategory ? { category: cat, product: bestInCategory } : null;
    })
    .filter(Boolean);
}

function renderCategorySuggestions() {
  const resultsGrid = document.querySelector(".results__grid");
  if (!resultsGrid) return;

  const categories = getCategoryOptions();
  const picks = pickOnePerCategory(products, categories);
  if (!picks.length) return;

  setShopControlsState("ready");
  setResultsMessage("");
  hideError();
  hideSkeletonOnly();

  resultsGrid.innerHTML = picks
    .map(({ category, product }) => {
      const label = toTitleCaseCategory(category);
      return `
          <li>
            <button type="button" class="product__card category__card" data-category="${category}">
              <img src="${product.image}" alt="${product.title}" />
              <div class="product__card--body">
                <p class="category__label">${label}</p>
                <h3>${product.title}</h3>
                <p class="product__card--price">$${product.price.toFixed(2)}</p>
                <p>${ratingStars(
                  product.rating?.rate,
                  product.rating?.count
                )}</p>
              </div>
            </button>
          </li>`;
    })
    .join("");
}

function renderFeatured(list = []) {
  const featuredSection = document.getElementById("featured__section");
  const featuredGrid = document.querySelector(".featured__grid");
  if (!featuredSection || !featuredGrid) return;

  featuredSection.classList.toggle("hidden", !list.length);

  const html = (Array.isArray(list) ? list : [])
    .map(
      (p) => `
      <li class="product__card">
        <img src="${p.image}" alt="${p.title}" />
        <div class="product__card--body">
          <h3>${p.title}</h3>
          <p class="product__card--price">$${p.price.toFixed(2)}</p>
          <p>${ratingStars(p.rating?.rate, p.rating?.count)}</p>
        </div>
      </li>`
    )
    .join("");

  featuredGrid.innerHTML = html;
}

function pickFeaturedProducts(source = [], count = 3) {
  return [...source]
    .sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0))
    .slice(0, count);
}

async function getProducts() {
  try {
    hideError();
    setShopControlsState("loading");
    setResultsMessage("Loading products...");
    showSkeletonOnly();

    await loadProducts();

    renderFeatured(pickFeaturedProducts(products));

    hideSkeletonOnly();
    setResultsMessage("");
    setShopControlsState("ready");
  } catch (err) {
    hideSkeletonOnly();
    setResultsMessage("");
    setShopControlsState("ready");
    showError("Unable to load products right now. Please try again later.");
    console.error("Failed to fetch Products", err);
  }
}

function filterProducts(term = "", category = "") {
  const query = term.trim().toLowerCase();
  const selectedCategory = category.trim().toLowerCase();
  const showAll = query === "all" || query === "*";

  const queryIsCategory = [
    "electronics",
    "jewelery",
    "men's clothing",
    "women's clothing",
  ].includes(query);

  return products.filter((p) => {
    if (showAll) return true;

    const title = (p.title || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();

    const matchesText = query
      ? title.includes(query) || (queryIsCategory && cat === query)
      : true;

    const matchesCategory = selectedCategory ? cat === selectedCategory : true;

    return matchesText && matchesCategory;
  });
}

async function runSearch(term = "", category = "", opts = {}) {
  const {
    mode = "full",
  } = opts;

  const runId = ++latestSearchRunId;
  hasSearched = true;

  const isQuiet = mode === "quiet";

  try {
    if (!isQuiet) {
      hideError();
      setShopControlsState("loading");
      setResultsMessage("Searching...");
      showSkeletonOnly();
    } else {
      hideError();
      hideSkeletonOnly();
      setResultsMessage("");
      setShopControlsState("ready");
    }

    await loadProducts();

    const started = performance.now();
    const filtered = filterProducts(term, category);

    if (!isQuiet) {
      const elapsed = performance.now() - started;
      const remaining = Math.max(0, MIN_SKELETON_MS - elapsed);
      if (remaining) await sleep(remaining);
    }

    if (runId !== latestSearchRunId) return;

    if (
      mode === "full" &&
      window.location.pathname.toLowerCase().includes("shop.html")
    ) {
      setShopUrlParams(term, category);
    }

    currentResults = filtered;
    renderProducts(currentResults);

    if (!currentResults.length) {
      if (!isQuiet) {
        setShopControlsState("empty");
        setResultsMessage("No results found ...");
      } else {
        setShopControlsState("ready");
        setResultsMessage("");
      }
    } else {
      setShopControlsState("ready");
      setResultsMessage("");
    }
  } catch (err) {
    if (!isQuiet && runId === latestSearchRunId) {
      setShopControlsState("ready");
      setResultsMessage("");
      showError("Search failed. Please try again.");
    }
    console.error("runSearch failed:", err);
  } finally {
    if (!isQuiet && runId === latestSearchRunId) {
      hideSkeletonOnly();
    }
  }
}

function performSearch(inputId = "searchInput") {
  const target = document.getElementById(inputId);
  if (!target) return;
  const term = target.value.trim();
  if (term) {
    window.location.href = `shop.html?search=${encodeURIComponent(term)}`;
  } else {
    window.location.href = "shop.html";
  }
}

async function showRandomProduct() {
  try {
    if (!products.length) {
      await loadProducts();
    }

    const randomIndex = Math.floor(Math.random() * products.length);
    const product = products[randomIndex];

    const container = document.getElementById("randomProduct");
    if (container) {
      container.innerHTML = `
        <div class="product__card">
          <img src="${product.image}" alt="${product.title}" />
          <div class="product__card--body">
            <h3>${product.title}</h3>
            <p class="product__card--price">$${product.price.toFixed(2)}</p>
            <p>${ratingStars(product.rating?.rate, product.rating?.count)}</p>
          </div>
        </div>`;
    }
  } catch (err) {
    console.error("Failed to fetch random product", err);
    const container = document.getElementById("randomProduct");
    if (container) {
      container.innerHTML = `<p>Unable to load a product right now. Please refresh.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname.toLowerCase();

  document.querySelector(".menu__links")?.addEventListener("click", (e) => {
    const link = e.target.closest('a[href="#"]');
    if (!link) return;
    e.preventDefault();
    closeMenu();
  });

  const isHome = !!document.getElementById("randomProduct");
  if (isHome) {
    const homeSearchInput = document.getElementById("searchInput");
    const homeSearchBtn = document.querySelector(".search__btn");

    if (homeSearchBtn) {
      homeSearchBtn.addEventListener("click", () =>
        performSearch("searchInput")
      );
    }

    if (homeSearchInput) {
      homeSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          performSearch("searchInput");
        }
      });
    }

    showRandomProduct();
    return;
  }

  if (path.includes("shop.html")) {
    const searchTerm = getQueryParam("search");

    const shopSearchBtn = document.querySelector(".search__btn");
    const shopSearchInput = document.getElementById("searchInput");
    const filterSelect = document.getElementById("filterSelect");
    const resultsGrid = document.querySelector(".results__grid");

    const categoryParam = getQueryParam("category") || "";

    if (shopSearchInput && searchTerm) shopSearchInput.value = searchTerm;
    if (filterSelect && categoryParam) filterSelect.value = categoryParam;

    if (shopSearchInput && searchTerm) {
      shopSearchInput.value = searchTerm;
    }

    if (resultsGrid) {
      resultsGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".category__card");
        if (!btn) return;

        const category = btn.dataset.category || "";
        if (filterSelect) filterSelect.value = category;

        runSearch("", category, { mode: "full" });
        setShopUrlParams("", category);
      });
    }

    if (shopSearchBtn) {
      shopSearchBtn.addEventListener("click", () =>
        runSearch(
          shopSearchInput ? shopSearchInput.value : "",
          filterSelect ? filterSelect.value : "",
          { mode: "full" }
        )
      );
    }

    if (shopSearchInput) {
      shopSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runSearch(
            shopSearchInput.value,
            filterSelect ? filterSelect.value : "",
            { mode: "full" }
          );
        }
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener("change", () => {
        hideError();
        hideSkeletonOnly();
        setResultsMessage("");
        setShopControlsState("ready");
      });
    }
    await getProducts();

    if (!searchTerm) {
      renderCategorySuggestions(); 
    } else {
      runSearch(searchTerm, filterSelect ? filterSelect.value : categoryParam, {
        mode: "full",
      });
    }
  }
});
