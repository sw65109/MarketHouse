let products = [];
let currentResults = [];
let hasSearched = false;

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
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

function showSkeleton(message = "Loading...") {
  if (resultsMessage) {
    resultsMessage.textContent = message;
    resultsMessage.hidden = false;
  }
  if (skeleton) skeleton.classList.remove("hidden");
}
function hideSkeleton() {
  if (resultsMessage) {
    resultsMessage.hidden = true;
    resultsMessage.textContent = "";
  }
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

function ratingStars(rate = 0, count = 0) {
  const safeRate = Math.max(0, Math.min(5, Number(rate) || 0));
  const reviewCount = Number(count) || 0;

  const fullStars = Math.floor(rate);
  const hasHalf = rate % 1 > 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const full = `<i class="fa-solid fa-star" aria-hidden="true"></i>`.repeat(fullStars);
  const half = hasHalf
    ? '<i class="fa-solid fa-star-half" aria-hidden="true"></i>' : "";
  const empty = '<i class="fa-regular fa-star" aria-hidden="true"></i>'.repeat(emptyStars);

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
  const html = list
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
      .filter((v) => v && v.trim().length); // skip "All Categories"
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
  
    if (resultsMessage) resultsMessage.hidden = true;
    hideError();
    hideSkeleton();
  
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
                <p>${ratingStars(product.rating?.rate, product.rating?.count)}</p>
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
  
    const html = list
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
    showSkeleton("Loading products...");
    const res = await fetch("https://fakestoreapi.com/products");
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    products = await res.json();
    renderFeatured(pickFeaturedProducts(products));
    hideSkeleton();
  } catch (err) {
    hideSkeleton();
    showError("Unable to load products right now. Please try again later.");
    console.error("Failed to fetch Products", err);
  }
}

function searchProducts(term = "", category = "") {
  const query = term.trim().toLowerCase();
  const selectedCategory = category.trim().toLowerCase();
  const showAll = query === "all" || query === "*";

  hasSearched = true;

  currentResults = products.filter((p) => {
    if (showAll) return true;
    const title = p.title.toLowerCase();
    const cat = p.category.toLowerCase();

    const queryIsCategory = [
      "electronics",
      "jewelery",
      "men's clothing",
      "women's clothing",
    ].includes(query);

    const matchesText = query
      ? title.includes(query) || (queryIsCategory && cat === query)
      : true;

    const matchesCategory = selectedCategory ? cat === selectedCategory : true;

    return matchesText && matchesCategory;
  });

  renderProducts(currentResults);
  if (!currentResults.length) {
    showSkeleton("No results found ...");
  } else {
    hideSkeleton();
    resultsMessage.hidden = true;
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
      const res = await fetch("https://fakestoreapi.com/products");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      products = await res.json();
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
      homeSearchBtn.addEventListener("click", () => performSearch("searchInput"));
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
    await getProducts();

    const searchTerm = getQueryParam("search");
    if (!searchTerm) {
      renderCategorySuggestions();
    }

    const shopSearchBtn = document.querySelector(".search__btn");
    const shopSearchInput = document.getElementById("searchInput");
    const filterSelect = document.getElementById("filterSelect");
    const resultsGrid = document.querySelector(".results__grid");

    if (resultsGrid) {
      resultsGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".category__card");
        if (!btn) return;

        const category = btn.dataset.category || "";
        if (filterSelect) filterSelect.value = category;

        searchProducts("", category);
      });
    }

    if (shopSearchBtn && shopSearchInput) {
      shopSearchBtn.addEventListener("click", () =>
        searchProducts(
          shopSearchInput.value,
          filterSelect ? filterSelect.value : ""
        )
      );
    }

    if (shopSearchInput) {
      shopSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          searchProducts(
            shopSearchInput.value,
            filterSelect ? filterSelect.value : ""
          );
        }
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener("change", (e) =>
        searchProducts(
          shopSearchInput ? shopSearchInput.value : "",
          e.target.value
        )
      );
    }

    if (searchTerm) {
      searchProducts(searchTerm, filterSelect ? filterSelect.value : "");
    }
  }
});
