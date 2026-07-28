let cart = JSON.parse(localStorage.getItem("kenzieCart")) || [];
let cartDrawerTimer = null;

function saveCart() {
  localStorage.setItem("kenzieCart", JSON.stringify(cart));
}

function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function updateCartLink() {
  const cartBadge = document.querySelector(".cart-count-badge");
  if (!cartBadge) return;

  const count = getCartCount();
  cartBadge.textContent = count;

  cartBadge.classList.remove("cart-bump");
  void cartBadge.offsetWidth;
  cartBadge.classList.add("cart-bump");
}

function openCartDrawer(autoClose = false) {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-drawer-overlay");

  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("show");

  clearTimeout(cartDrawerTimer);

  if (autoClose) {
    cartDrawerTimer = setTimeout(() => closeCartDrawer(), 2500);
  }
}

function closeCartDrawer() {
  document.getElementById("cart-drawer")?.classList.remove("open");
  document.getElementById("cart-drawer-overlay")?.classList.remove("show");
  clearTimeout(cartDrawerTimer);
}

function addToCart(name, price, type = "general", image = "images/placeholder.jpg", shopifyHandle = "", customAttributes = []) {
  const existingItem = cart.find(item =>
    item.name === name &&
    item.shopifyHandle === shopifyHandle &&
    JSON.stringify(item.customAttributes || []) === JSON.stringify(customAttributes || [])
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name,
      price,
      quantity: 1,
      type,
      image,
      shopifyHandle,
      customAttributes
    });
  }

  saveCart();
  renderCart();
  renderSummaryPage();
  updateCartLink();
  openCartDrawer();
}

/* =========================
   SPECIAL ADD TO CART LOGIC
========================= */

async function addShopifyProductToLocalCart(handle, variantTitleOrAttributes = [], customAttributes = []) {
  try {
    const product = await getShopifyProductByHandle(handle);

    if (!product) {
      alert("This product could not be found right now.");
      return;
    }

    let variantTitle = "";
    let attributes = [];

    if (Array.isArray(variantTitleOrAttributes)) {
      attributes = variantTitleOrAttributes;
    } else {
      variantTitle = variantTitleOrAttributes;
      attributes = customAttributes;
    }

    const variants = product?.variants?.edges || [];

    const variant =
      variants.find(edge => edge.node.title === variantTitle)?.node ||
      variants[0]?.node;

    if (!variant) {
      alert("This product option could not be found right now.");
      return;
    }

    const price = Number(variant.price.amount);

    const image =
      variant.image?.url ||
      product.featuredImage?.url ||
      "images/placeholder.jpg";

    const optionAttributes = variantTitle
      ? [{ key: "Sticker Option", value: variantTitle }]
      : [];

    addToCart(
      variantTitle ? `${product.title} - ${variantTitle}` : product.title,
      price,
      "shopify",
      image,
      handle,
      [
        ...optionAttributes,
        ...attributes,
        { key: "Shopify Variant ID", value: variant.id }
      ]
    );
  } catch (error) {
    console.error("Add Shopify product to local cart failed:", error);
    alert("Could not add this product to cart yet.");
  }
}

function handleNameLabelCart() {
  const selected = document.querySelector('input[name="personalize"]:checked');
  const input = document.getElementById("custom-name");

  if (!selected) return;

  if (selected.value === "custom") {
    if (!input || !input.value.trim()) return;
    addToCart(`Name Labels (${input.value.trim()})`, 4.99, "custom", "images/placeholder.jpg");
  } else {
    addToCart("Name Labels", 4.49, "sticker", "images/placeholder.jpg");
  }
}

function handleBabyBoxCart() {
  const selected = document.querySelector('input[name="baby-theme"]:checked');
  if (!selected) return;

  const theme = selected.value === "boy" ? "Boy" : "Girl";
  addToCart(`Welcome Box (${theme})`, 28, "gift", "images/placeholder.jpg");
}

/* =========================
   TOTALS LOGIC
========================= */

function calculateTotals() {
  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.quantity;
  });

  const discount = 0;
  const shipping = 0;
  const total = subtotal;

  return { subtotal, discount, shipping, total };
}

/* =========================
   CART RENDER
========================= */

function renderCart() {
  const drawerItems = document.getElementById("cart-drawer-items");
  const drawerTotal = document.getElementById("cart-drawer-total");
  const msg = document.getElementById("free-shipping-message");

  if (!drawerItems) return;

  if (cart.length === 0) {
    drawerItems.innerHTML = `
      <div class="empty-cart-box">
        <h3>Your cart is empty</h3>
        <p>Pick something special for your little one 💕</p>
      </div>
    `;
    if (drawerTotal) drawerTotal.textContent = "0.00";
    if (msg) msg.textContent = "";
    return;
  }

  let html = "";

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;

    const itemOptions = item.customAttributes?.filter(
      attr => attr.key !== "Shopify Variant ID"
    );

    html += `
      <div class="cart-item">
        <div class="cart-item-left">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-details">$${item.price.toFixed(2)} each</div>

          ${itemOptions?.length ? `
            <div class="cart-item-options">
              ${itemOptions.map(attr => `
                <span>${attr.key}: ${attr.value}</span>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <div class="cart-item-middle">
          <button onclick="decreaseQuantity(${index})">−</button>
          <span>${item.quantity}</span>
          <button onclick="increaseQuantity(${index})">+</button>
        </div>

        <div class="cart-item-right">
          <div>$${itemTotal.toFixed(2)}</div>
          <button onclick="removeFromCart(${index})">Remove</button>
        </div>
      </div>
    `;
  });

  drawerItems.innerHTML = html;

  const { subtotal } = calculateTotals();
  if (drawerTotal) drawerTotal.textContent = subtotal.toFixed(2);

  if (msg) msg.textContent = "";
}

/* =========================
   SUMMARY PAGE LOGIC
========================= */

function renderSummaryPage() {
  const summaryItems = document.getElementById("summary-items");
  if (!summaryItems) return;

  const { subtotal, discount, shipping, total } = calculateTotals();

  if (cart.length === 0) {
    summaryItems.innerHTML = `
      <div class="empty-cart-box">
        <h3>Your cart is empty</h3>
        <p>Pick something special for your little one 💕</p>
      </div>
    `;

    document.getElementById("summary-subtotal")?.replaceChildren(document.createTextNode("$0.00"));
    document.getElementById("summary-discount")?.replaceChildren(document.createTextNode("-$0.00"));
    document.getElementById("summary-shipping")?.replaceChildren(document.createTextNode("Calculated at checkout"));
    document.getElementById("summary-total")?.replaceChildren(document.createTextNode("$0.00"));
    document.getElementById("summary-discount-row")?.style.setProperty("display", "none");

    const msg = document.getElementById("free-shipping-message");
    if (msg) msg.textContent = "";
    return;
  }

  summaryItems.innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item-thumb">
        <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.name}">
      </div>
      <div class="summary-item-content">
        <div class="summary-item-name">${item.name}</div>
       <div class="summary-item-meta">
  $${item.price.toFixed(2)} each
</div>

<div class="summary-item-line-total">
  Line Total: $${(item.price * item.quantity).toFixed(2)}
</div>

<div class="summary-item-controls">
  <button
    type="button"
    onclick="decreaseQuantity(${cart.indexOf(item)})"
  >
    −
  </button>

  <span>${item.quantity}</span>

  <button
    type="button"
    onclick="increaseQuantity(${cart.indexOf(item)})"
  >
    +
  </button>

  <button
    type="button"
    class="summary-remove-btn"
    onclick="removeFromCart(${cart.indexOf(item)})"
  >
    Remove
  </button>
</div>

${item.customAttributes?.filter(
  attr => attr.key !== "Shopify Variant ID"
).length ? `
  <div class="summary-item-options">
    ${item.customAttributes
      .filter(attr => attr.key !== "Shopify Variant ID")
      .map(attr => `
        <span>${attr.key}: ${attr.value}</span>
      `).join("")}
  </div>
` : ""}
      </div>
    </div>
  `).join("");

  const subtotalEl = document.getElementById("summary-subtotal");
  const discountEl = document.getElementById("summary-discount");
  const shippingEl = document.getElementById("summary-shipping");
  const totalEl = document.getElementById("summary-total");

  const discountRow = document.getElementById("summary-discount-row");

if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

if (discountEl) {
  discountEl.textContent = `-$${discount.toFixed(2)}`;
}

if (discountRow) {
  discountRow.style.display = discount > 0 ? "flex" : "none";
}

if (shippingEl) shippingEl.textContent = "Calculated at checkout";
if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

const msg = document.getElementById("free-shipping-message");
if (msg) msg.textContent = "";
}

/* =========================
   QUANTITY CONTROLS
========================= */

function increaseQuantity(i) {
  cart[i].quantity++;
  saveCart();
  renderCart();
  renderSummaryPage();
  updateCartLink();
}

function decreaseQuantity(i) {
  if (cart[i].quantity > 1) {
    cart[i].quantity--;
  } else {
    cart.splice(i, 1);
  }
  saveCart();
  renderCart();
  renderSummaryPage();
  updateCartLink();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  saveCart();
  renderCart();
  renderSummaryPage();
  updateCartLink();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  renderSummaryPage();
  updateCartLink();
}

/* =========================
   PAGE HELPERS
========================= */

function setupPersonalizationCards() {
  const radios = document.getElementsByName("personalize");
  const inputBox = document.getElementById("custom-input-box");
  const preview = document.getElementById("name-preview");
  const customNameInput = document.getElementById("custom-name");
  const priceEl = document.getElementById("name-label-price");
  const priceNoteEl = document.getElementById("name-label-price-note");

  if (radios.length) {
    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        const cards = document.querySelectorAll('input[name="personalize"]');
        cards.forEach(input => {
          input.closest(".personalization-card")?.classList.remove("active-option");
        });

        if (radio.checked) {
          radio.closest(".personalization-card")?.classList.add("active-option");
        }

        if (radio.value === "custom") {
          if (inputBox) inputBox.style.display = "block";
          if (priceEl) priceEl.textContent = "$4.99";
          if (priceNoteEl) priceNoteEl.textContent = "Personalized waterproof option";
        } else {
          if (inputBox) inputBox.style.display = "none";
          if (priceEl) priceEl.textContent = "$4.49";
          if (priceNoteEl) priceNoteEl.textContent = "Standard option";
        }
      });
    });
  }

  if (customNameInput && preview) {
    customNameInput.addEventListener("input", () => {
      const value = customNameInput.value.trim();
      preview.textContent = value ? value : "Olivia";
    });
  }
}

function setupEasterPreview() {
  const input = document.getElementById("easter-custom-name");
  const preview = document.getElementById("easter-name-preview");

  if (input && preview) {
    input.addEventListener("input", () => {
      const value = input.value.trim();
      preview.textContent = value ? value : "Olivia";
    });
  }
}

function setupBabyThemeCards() {
  const radios = document.getElementsByName("baby-theme");

  if (radios.length) {
    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        const cards = document.querySelectorAll('input[name="baby-theme"]');
        cards.forEach(input => {
          input.closest(".personalization-card")?.classList.remove("active-option");
        });

        if (radio.checked) {
          radio.closest(".personalization-card")?.classList.add("active-option");
        }
      });
    });
  }
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  renderSummaryPage();
  updateCartLink();
  setupPersonalizationCards();
  setupEasterPreview();
  setupBabyThemeCards();

  document.getElementById("cart-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    openCartDrawer();
  });

  document.getElementById("cart-drawer-overlay")?.addEventListener("click", closeCartDrawer);

  // PAYMENT PAGE
  const paymentSummaryItems = document.getElementById("payment-summary-items");

  if (paymentSummaryItems) {
    const { subtotal, discount, shipping, total } = calculateTotals();

    if (cart.length === 0) {
      paymentSummaryItems.innerHTML = `
        <div class="empty-cart-box">
          <h3>Your cart is empty</h3>
          <p>Pick something special for your little one 💕</p>
        </div>
      `;
    } else {
      paymentSummaryItems.innerHTML = cart.map(item => `
        <div class="summary-item">
          <div class="summary-item-thumb">
            <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.name}">
          </div>
          <div class="summary-item-content">
            <div class="summary-item-name">${item.name}</div>
            <div class="summary-item-meta">
              Qty: ${item.quantity} • $${item.price.toFixed(2)}
            </div>
          </div>
        </div>
      `).join("");
    }

    const paymentSubtotal = document.getElementById("payment-subtotal");
    const paymentDiscount = document.getElementById("payment-discount");
    const paymentShipping = document.getElementById("payment-shipping");
    const paymentTotal = document.getElementById("payment-total");
    const paymentMsg = document.getElementById("payment-free-shipping-message");

    if (paymentSubtotal) paymentSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (paymentDiscount) paymentDiscount.textContent = `-$${discount.toFixed(2)}`;
    if (paymentShipping) paymentShipping.textContent = "Calculated at checkout";
if (paymentTotal) paymentTotal.textContent = `$${total.toFixed(2)}`;

if (paymentMsg) paymentMsg.textContent = "";
  }
});

/* =========================
   NAME LABEL PERSONALIZER
========================= */

if (window.location.pathname.includes("name-label-personalize.html")) {
  const labelDesigns = {
    football: {
      title: "Football Name Label",
      image: "assets/name-label-football.png"
    },
    rocket: {
      title: "Rocket Name Label",
      image: "assets/name-label-rocket.png"
    },
    space: {
      title: "Space Name Label",
      image: "assets/name-label-space.png"
    },
    "cheerleader-1": {
      title: "Cheerleader 1 Name Label",
      image: "assets/name-label-cheerleader-1.png"
    },
    "cheerleader-2": {
      title: "Cheerleader 2 Name Label",
      image: "assets/name-label-cheerleader-2.png"
    },
    "horse-girl": {
      title: "Horse Girl Name Label",
      image: "assets/name-label-horse-girl.png"
    },
    "ballerina-1": {
      title: "Ballerina 1 Name Label",
      image: "assets/name-label-ballerina-1.png"
    },
    "ballerina-2": {
      title: "Ballerina 2 Name Label",
      image: "assets/name-label-ballerina-2.png"
    },
    school: {
      title: "School Name Label",
      image: "assets/name-label-school.png"
    },
    capybara: {
      title: "Capybara Name Label",
      image: "assets/name-label-capybara.png"
    }
  };

  const params = new URLSearchParams(window.location.search);
  const selectedDesignKey = params.get("design") || "football";
  const selectedDesign = labelDesigns[selectedDesignKey] || labelDesigns.football;

  const selectedLabelTitle = document.getElementById("selected-label-title");
  const selectedLabelImage = document.getElementById("selected-label-image");
  const childNameInput = document.getElementById("child-name");
  const nameCount = document.getElementById("name-count");
  const fontChoice = document.getElementById("font-choice");
  const liveNamePreview = document.getElementById("live-name-preview");

  if (
    selectedLabelTitle &&
    selectedLabelImage &&
    childNameInput &&
    nameCount &&
    fontChoice &&
    liveNamePreview
  ) {
    selectedLabelTitle.textContent = selectedDesign.title;
    selectedLabelImage.src = selectedDesign.image;
    selectedLabelImage.alt = selectedDesign.title + " Preview";

    function updateLabelPreview() {
      const nameValue = childNameInput.value.trim() || "Your Name";
      const selectedFont = fontChoice.value;

      nameCount.textContent = childNameInput.value.length;

      liveNamePreview.textContent = nameValue;
      liveNamePreview.style.fontFamily = '"' + selectedFont + '"';
    }

    childNameInput.addEventListener("input", updateLabelPreview);
    fontChoice.addEventListener("change", updateLabelPreview);

    updateLabelPreview();

    window.addPersonalizedNameLabelToCart = function () {
      const childName = childNameInput.value.trim();
      const selectedFont = fontChoice.value;
      const quantity = Math.max(
        1,
        parseInt(document.getElementById("label-quantity").value, 10) || 1
      );
      const notes = document.getElementById("special-notes").value.trim();

      if (!childName) {
        alert("Please enter the child’s name before adding to cart.");
        childNameInput.focus();
        return;
      }

      const cartTitle =
        selectedDesign.title +
        " - Personalized" +
        " | Name: " + childName +
        " | Font: " + selectedFont +
        (notes ? " | Notes: " + notes : "");

      for (let i = 0; i < quantity; i++) {
        addToCart(
          cartTitle,
          0.00,
          "personalized-name-label",
          selectedDesign.image
        );
      }
    };
  }
}

/* =========================
   PRODUCT IMAGE LIGHTBOX
========================= */

let lightboxImages = [];
let currentLightboxIndex = 0;

function openProductLightbox(clickedImg) {
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImg = document.getElementById("image-lightbox-img");

  if (!lightbox || !lightboxImg || !clickedImg) return;

  lightboxImages = Array.from(
    document.querySelectorAll(
      "#shopify-main-image, .product-main-image-wrap img, .detail-thumb img, .shopify-sticker-card .shopify-card-image"
    )
  )
    .map((img) => ({
      src: img.src,
      alt: img.alt || "Large product preview"
    }))
    .filter((item, index, self) =>
      item.src && self.findIndex((img) => img.src === item.src) === index
    );

  currentLightboxIndex = lightboxImages.findIndex(
    (img) => img.src === clickedImg.src
  );

  if (currentLightboxIndex < 0) {
    currentLightboxIndex = 0;
  }

  lightboxImg.src = lightboxImages[currentLightboxIndex].src;
  lightboxImg.alt = lightboxImages[currentLightboxIndex].alt;
  lightbox.classList.add("show");
}

function changeLightboxImage(direction) {
  const lightboxImg = document.getElementById("image-lightbox-img");

  if (!lightboxImg || !lightboxImages.length) return;

  currentLightboxIndex =
    (currentLightboxIndex + direction + lightboxImages.length) %
    lightboxImages.length;

  lightboxImg.src = lightboxImages[currentLightboxIndex].src;
  lightboxImg.alt = lightboxImages[currentLightboxIndex].alt;
}

document.addEventListener("click", (e) => {
  const clickedImg = e.target.closest(
    "#shopify-main-image, .product-main-image-wrap img, .detail-thumb img, .shopify-sticker-card .shopify-card-image"
  );

  const lightbox = document.getElementById("image-lightbox");

  if (clickedImg) {
    openProductLightbox(clickedImg);
    return;
  }

  if (e.target.classList.contains("lightbox-prev")) {
    e.stopPropagation();
    changeLightboxImage(-1);
    return;
  }

  if (e.target.classList.contains("lightbox-next")) {
    e.stopPropagation();
    changeLightboxImage(1);
    return;
  }

  if (
    e.target.classList.contains("image-lightbox") ||
    e.target.classList.contains("image-lightbox-close")
  ) {
    lightbox?.classList.remove("show");
  }
});

/* =========================
   SHOPIFY CONFIG — TEST ONLY
========================= */

const SHOPIFY_STORE_URL = "kenzieprints-mlhtwcyt.myshopify.com";
const SHOPIFY_STOREFRONT_TOKEN = "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";

/* =========================
   SHOPIFY TEST — LOAD PRODUCT
========================= */

async function testShopifyProduct() {
  const productHandle = "my-little-explorer-activity-kit";

  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        availableForSale
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_URL}/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  "Shopify-Storefront-Private-Token": SHOPIFY_STOREFRONT_TOKEN
},
        body: JSON.stringify({
          query,
          variables: {
            handle: productHandle
          }
        })
      }
    );

    const result = await response.json();

    console.log("SHOPIFY TEST RESULT:", result);

    if (result.errors) {
      console.error("Shopify API errors:", result.errors);
      alert("Shopify connected, but there is an API error. Check console.");
      return;
    }

    const product = result.data?.productByHandle;

    if (!product) {
      alert("Shopify connected, but product was not found.");
      return;
    }

    alert(
      "Shopify connected successfully!\n\nProduct: " +
        product.title +
        "\nPrice: $" +
        product.variants.edges[0].node.price.amount
    );
  } catch (error) {
    console.error("Shopify connection failed:", error);
    alert("Shopify connection failed. Check console.");
  }
}

/* =========================
   SHOPIFY CART — FIRST REAL TEST
========================= */

async function shopifyFetch(query, variables = {}) {
  const response = await fetch(
    `https://${SHOPIFY_STORE_URL}/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": SHOPIFY_STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query, variables })
    }
  );

  const result = await response.json();

  if (result.errors) {
    console.error("Shopify errors:", result.errors);
    throw new Error("Shopify API error");
  }

  return result.data;
}

/* =========================
   SHOPIFY POLICY LOADER
========================= */

async function getShopifyPolicies() {
  const query = `
    query getShopPolicies {
      shop {
        privacyPolicy {
          title
          body
          url
        }
        termsOfService {
          title
          body
          url
        }
        refundPolicy {
          title
          body
          url
        }
        shippingPolicy {
          title
          body
          url
        }
       subscriptionPolicy {
          title
          body
          url
        }
      }
    }
  `;

  const data = await shopifyFetch(query);
  return data.shop;
}

async function loadShopifyPolicyPage() {
  const policyPage = document.querySelector("[data-shopify-policy]");
  if (!policyPage) return;

  const policyKey = policyPage.dataset.shopifyPolicy;
  const titleEl = document.getElementById("shopify-policy-title");
  const bodyEl = document.getElementById("shopify-policy-body");

  if (!policyKey || !bodyEl) return;

  try {
    const policies = await getShopifyPolicies();
    const policy = policies?.[policyKey];

    if (!policy) {
      bodyEl.innerHTML = "<p>Policy not available.</p>";
      return;
    }

    if (titleEl) {
      titleEl.textContent = policy.title || "Policy";
    }

    bodyEl.innerHTML = policy.body || "<p>Policy content unavailable.</p>";
  } catch (error) {
    console.error("Shopify policy load failed:", error);
    bodyEl.innerHTML =
      "<p>Policy could not be loaded right now. Please try again later.</p>";
  }
}

/* =========================
   SHOPIFY OUR STORY
========================= */

async function getShopifyPageByHandle(handle) {
  const query = `
    query getPage($handle: String!) {
      page(handle: $handle) {
        title
        body
      }
    }
  `;

  const data = await shopifyFetch(query, {
    handle
  });

  return data.page;
}

async function loadShopifyOurStory() {

  const page =
    document.querySelector("[data-shopify-story]");

  if (!page) return;

  const handle =
    page.dataset.shopifyStory;

  const title =
    document.getElementById(
      "shopify-story-title"
    );

  const body =
    document.getElementById(
      "shopify-story-body"
    );

  try {

    const story =
      await getShopifyPageByHandle(handle);

    if (!story) return;

    if (title) {
      title.textContent =
        story.title;
    }

    if (body) {
      body.innerHTML =
        story.body;
    }

  } catch (error) {

    console.error(
      "Our Story failed:",
      error
    );

  }

}

async function getShopifyProductByHandle(handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
                descriptionHtml
        availableForSale

        howToUse: metafield(namespace: "custom", key: "how_to_use") {
          value
        }

        careInstructions: metafield(namespace: "custom", key: "care_instructions") {
          value
        }

        safetyNote: metafield(namespace: "custom", key: "safety_note") {
          value
        }

        featuredImage {
          url
          altText
        }

        images(first: 6) {
          edges {
            node {
              url
              altText
            }
          }
        }

        variants(first: 50) {
  edges {
    node {
      id
      title
      availableForSale
      image {
        url
        altText
      }
      price {
        amount
        currencyCode
      }
    }
  }
}
      }
    }
  `;

  const data = await shopifyFetch(query, { handle });
  return data.productByHandle;
}

async function loadShopifyProductPrice() {
  const priceEl = document.getElementById("shopify-product-price");
  if (!priceEl) return;

  const handle = priceEl.dataset.shopifyHandle;
  if (!handle) return;

  try {
    const product = await getShopifyProductByHandle(handle);
    const variant = product?.variants?.edges?.[0]?.node;

    if (!product || !variant) {
      priceEl.textContent = "Unavailable";
      return;
    }

    priceEl.textContent = `$${Number(variant.price.amount).toFixed(2)}`;
  } catch (error) {
    console.error("Price load failed:", error);
    priceEl.textContent = "Price unavailable";
  }
}

async function loadShopifyProductDetails() {
  const productPage = document.querySelector("[data-shopify-product]");
  if (!productPage) return;

  const handle = productPage.dataset.shopifyProduct;
  if (!handle) return;

  try {
    const product = await getShopifyProductByHandle(handle);
    const variant = product?.variants?.edges?.[0]?.node;

    if (!product || !variant) return;

    const titleEl = document.getElementById("shopify-product-title");
    const descEl = document.getElementById("shopify-product-description");
    const priceEl = document.getElementById("shopify-product-price");
    const mainImageEl = document.getElementById("shopify-main-image");

    if (titleEl) {
      titleEl.textContent = product.title;
    }

    if (descEl) {
      descEl.innerHTML = product.descriptionHtml || "";
    }

const howToUseEl = document.getElementById("shopify-how-to-use");
const careInstructionsEl = document.getElementById("shopify-care-instructions");
const safetyNoteEl = document.getElementById("shopify-safety-note");

if (howToUseEl && product.howToUse?.value) {
  howToUseEl.textContent = product.howToUse.value;
}

if (careInstructionsEl && product.careInstructions?.value) {
  careInstructionsEl.textContent = product.careInstructions.value;
}

if (safetyNoteEl && product.safetyNote?.value) {
  safetyNoteEl.textContent = product.safetyNote.value;
}

    if (priceEl) {
      priceEl.textContent = `$${Number(variant.price.amount).toFixed(2)}`;
    }

    if (mainImageEl && product.featuredImage?.url) {
  mainImageEl.src = product.featuredImage.url;
  mainImageEl.alt =
    product.featuredImage.altText ||
    product.title;
}

const thumbnailGrid =
  productPage.querySelector(".product-thumbnail-grid");

const shopifyImages =
  product.images?.edges || [];

const isHalloweenProduct =
  handle === "glow-in-the-dark-halloween-bag";

if (
  thumbnailGrid &&
  shopifyImages.length &&
  !isHalloweenProduct
) {
  thumbnailGrid.innerHTML = "";

  shopifyImages.forEach((imageEdge, index) => {
    const imageNode = imageEdge?.node;

    if (!imageNode?.url) return;

    const thumbButton =
      document.createElement("button");

    thumbButton.type = "button";
    thumbButton.className =
      "product-thumb-btn";

    thumbButton.dataset.thumbImage =
      imageNode.url;

    if (index === 0) {
      thumbButton.classList.add("active");
    }

    const thumbImage =
      document.createElement("img");

    thumbImage.src =
      imageNode.url;

    thumbImage.alt =
      imageNode.altText ||
      `${product.title} image ${index + 1}`;

    thumbButton.appendChild(
      thumbImage
    );

    thumbnailGrid.appendChild(
      thumbButton
    );
  });
}
  } catch (error) {
    console.error("Shopify product details load failed:", error);
  }
}

async function loadShopifyCollectionCards() {
  const cards = document.querySelectorAll(".shopify-collection-card");

  if (!cards.length) return;

  cards.forEach(async (card) => {
    const handle = card.dataset.shopifyHandle;
    const variantTitle = card.dataset.shopifyVariantTitle || "";

    if (!handle) return;

    try {
      const product = await getShopifyProductByHandle(handle);

      if (!product) return;

      const variants = product?.variants?.edges || [];

      const normalizeTitle = (text) =>
        String(text || "").trim().replace(/\s+/g, " ").toLowerCase();

      const variant =
        variants.find(edge =>
          normalizeTitle(edge.node.title) === normalizeTitle(variantTitle)
        )?.node ||
        variants[0]?.node;

      if (!variant) return;

      const imageEl =
        card.querySelector(".shopify-card-image");

      const titleEl =
        card.querySelector(".shopify-card-title");

      const descEl =
        card.querySelector(".shopify-card-description");

      const priceEl =
        card.querySelector(".shopify-card-price");

      const stickerImage =
        variant.image?.url ||
        product.featuredImage?.url;

      if (imageEl && stickerImage) {
        imageEl.src = stickerImage;
        imageEl.alt =
          variant.image?.altText ||
          product.featuredImage?.altText ||
          variantTitle ||
          product.title;
      }

      if (titleEl) {
        titleEl.textContent = variantTitle || product.title;
      }

      if (descEl) {
        const fullDescription =
          product.descriptionHtml
            ?.replace(/<[^>]*>/g, "")
            .trim() || "";

        const shortDescription =
          fullDescription.length > 150
            ? fullDescription.substring(0, 150) + "..."
            : fullDescription;

        descEl.textContent = shortDescription;

        const existingBtn = card.querySelector(".description-read-more");
        if (existingBtn) existingBtn.remove();

        if (fullDescription.length > 150) {
          const readMoreBtn = document.createElement("button");
          readMoreBtn.type = "button";
          readMoreBtn.className = "description-read-more";
          readMoreBtn.textContent = "Read More";
          readMoreBtn.dataset.title = variantTitle || product.title;
          readMoreBtn.dataset.description = fullDescription;

          descEl.insertAdjacentElement("afterend", readMoreBtn);
        }
      }

      if (priceEl) {
        priceEl.textContent =
          "$" +
          Number(variant.price.amount).toFixed(2);
      }
    } catch (error) {
      console.error(
        "Collection card load failed:",
        error
      );
    }
  });
}

async function loadShopifyStickerCards() {
  const cards = document.querySelectorAll(".shopify-sticker-card");

  if (!cards.length) return;

  cards.forEach(async (card) => {
    const handle = card.dataset.shopifyHandle;
    const variantTitle = card.dataset.shopifyVariantTitle;

    if (!handle || !variantTitle) return;

    try {
      const product = await getShopifyProductByHandle(handle);

      const normalize = (text = "") =>
  text.replace(/\s+/g, " ").trim().toLowerCase();

const variantEdge = product?.variants?.edges?.find((edge) => {
  return normalize(edge.node.title) === normalize(variantTitle);
});

      const variant = variantEdge?.node;

      if (!product || !variant) return;

      const imageEl = card.querySelector(".shopify-card-image");
      const titleEl = card.querySelector(".shopify-card-title");
      const descEl = card.querySelector(".shopify-card-description");
      const priceEl = card.querySelector(".shopify-card-price");

      const stickerImage =
  variant.image?.url ||
  product.featuredImage?.url;

const stickerImageAlt =
  variant.image?.altText ||
  product.featuredImage?.altText ||
  variantTitle;

if (imageEl && stickerImage) {
  imageEl.src = stickerImage;
  imageEl.alt = stickerImageAlt;
}

      if (titleEl) {
        titleEl.textContent = variantTitle;
      }

      if (descEl) {
        descEl.textContent =
          product.descriptionHtml
            ?.replace(/<[^>]*>/g, "")
            .substring(0, 120) + "...";
      }

      if (priceEl) {
        priceEl.textContent =
          "$" + Number(variant.price.amount).toFixed(2);
      }
    } catch (error) {
      console.error("Sticker card load failed:", error);
    }
  });
}

async function addShopifyProductToCart(handle, customAttributes = []) {

  try {
    const product = await getShopifyProductByHandle(handle);
    const variant = product?.variants?.edges?.[0]?.node;

    if (!product || !variant || !variant.availableForSale) {
      alert("This product is not available right now.");
      return;
    }

    const mutation = `
      mutation createCart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const lineItem = {
      merchandiseId: variant.id,
      quantity: 1
    };

    if (customAttributes.length) {
      lineItem.attributes = customAttributes;
    }

    const data = await shopifyFetch(mutation, {
      lines: [lineItem]
    });

    const errors = data.cartCreate.userErrors;

    if (errors.length) {
      console.error("Cart errors:", errors);
      alert(errors[0].message);
      return;
    }

    window.location.href = data.cartCreate.cart.checkoutUrl;
  } catch (error) {
    console.error("Add to Shopify cart failed:", error);
    alert("Could not add this product to Shopify cart yet.");
  }
}

async function checkoutLocalCartWithShopify() {
  const shopifyItems = cart.filter((item) => item.shopifyHandle);

  if (!shopifyItems.length) {
    alert("Your cart does not have any Shopify products ready for checkout.");
    return;
  }

  try {
    const lines = [];

    for (const item of shopifyItems) {
      const product = await getShopifyProductByHandle(item.shopifyHandle);
      const variant = product?.variants?.edges?.[0]?.node;

      if (!product || !variant || !variant.availableForSale) {
        alert(item.name + " is not available for Shopify checkout right now.");
        return;
      }

      const lineItem = {
        merchandiseId: variant.id,
        quantity: item.quantity
      };

      if (item.customAttributes?.length) {
        lineItem.attributes = item.customAttributes;
      }

      lines.push(lineItem);
    }

    const mutation = `
      mutation createCart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await shopifyFetch(mutation, { lines });
    const errors = data.cartCreate.userErrors;

    if (errors.length) {
      console.error("Shopify checkout cart errors:", errors);
      alert(errors[0].message);
      return;
    }

    window.location.href = data.cartCreate.cart.checkoutUrl;
  } catch (error) {
    console.error("Checkout with Shopify failed:", error);
    alert("Could not start Shopify checkout yet.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadShopifyProductPrice();
  loadShopifyProductDetails();
  loadShopifyCollectionCards();
  loadShopifyStickerCards();
  loadShopifyPolicyPage();
  loadShopifyOurStory();
});

/* =========================
   ACTIVITY KIT BUNDLE BUILDER
========================= */

/* =========================
   ACTIVITY KIT BUNDLE BUILDER
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const bundleCards = document.querySelectorAll(".activity-bundle-card");
  const bundleMessage = document.getElementById("activity-bundle-message");
  const bundleSelection = document.getElementById("activity-bundle-selection");
  const bundleAddBtn = document.getElementById("activity-bundle-add-btn");

  if (!bundleCards.length || !bundleMessage || !bundleSelection || !bundleAddBtn) {
    return;
  }

  const selectedKits = new Set();

  const kitLabels = {
    explorer: "Explorer",
    learner: "Learner",
    bedtime: "Bedtime"
  };

 const bundleVariantMap = {
  explorer_learner: {
    title: "Explorer + Learner Bundle",
    variantId: "gid://shopify/ProductVariant/47815638843543"
  },

  explorer_bedtime: {
    title: "Explorer + Bedtime Bundle",
    variantId: "gid://shopify/ProductVariant/47815638876311"
  },

  learner_bedtime: {
    title: "Learner + Bedtime Bundle",
    variantId: "gid://shopify/ProductVariant/47815638909079"
  },

  explorer_learner_bedtime: {
    title: "Explorer + Learner + Bedtime Bundle",
    variantId: "gid://shopify/ProductVariant/47815636091031"
  }
};

  function getBundleKey() {
  const selected = Array.from(selectedKits);

  if (
    selected.includes("explorer") &&
    selected.includes("learner") &&
    selected.includes("bedtime")
  ) {
    return "explorer_learner_bedtime";
  }

  if (
    selected.includes("explorer") &&
    selected.includes("learner")
  ) {
    return "explorer_learner";
  }

  if (
    selected.includes("explorer") &&
    selected.includes("bedtime")
  ) {
    return "explorer_bedtime";
  }

  if (
    selected.includes("learner") &&
    selected.includes("bedtime")
  ) {
    return "learner_bedtime";
  }

  return selected.join("_");
}

  function updateBundleBuilder() {
    const selectedArray = Array.from(selectedKits);
    const selectedLabels = selectedArray.map((kit) => kitLabels[kit]);

    if (!selectedArray.length) {
      bundleMessage.textContent =
        "Select 2 or 3 activity kits to unlock a bundle option."
      bundleSelection.textContent = "No kits selected yet.";
      bundleAddBtn.disabled = true;
      delete bundleAddBtn.dataset.variantId;
      return;
    }

    bundleSelection.textContent = selectedLabels.join(" + ");

    if (selectedArray.length === 1) {
      bundleMessage.textContent =
        "Choose one more kit to unlock a bundle.";
      bundleAddBtn.disabled = true;
      delete bundleAddBtn.dataset.variantId;
      return;
    }

    if (selectedArray.length > 3) {
  bundleMessage.textContent =
    "Please select up to 3 activity kits.";
      bundleAddBtn.disabled = true;
      delete bundleAddBtn.dataset.variantId;
      return;
    }

    const bundleKey = getBundleKey();
    const bundleData = bundleVariantMap[bundleKey];

    if (!bundleData) {
      bundleMessage.textContent =
        "This bundle combination is not available yet.";
      bundleAddBtn.disabled = true;
      delete bundleAddBtn.dataset.variantId;
      return;
    }

    bundleMessage.textContent = bundleData.title + " selected.";
    bundleAddBtn.disabled = false;
    bundleAddBtn.dataset.variantId = bundleData.variantId;
    bundleAddBtn.dataset.bundleTitle = bundleData.title;
  }

  async function getShopifyVariantById(variantId) {
  const query = `
    query getVariantById($id: ID!) {
      node(id: $id) {
        ... on ProductVariant {
          id
          title
          availableForSale
          price {
            amount
            currencyCode
          }
          product {
            title
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, {
    id: variantId
  });

  return data.node;
}

async function addShopifyVariantToLocalCart(variantId, title) {
  const variant = await getShopifyVariantById(variantId);

  if (!variant) {
    alert("This bundle could not be found right now.");
    return;
  }

  const price = Number(variant.price.amount);
  const image =
    variant.product?.featuredImage?.url ||
    "images/placeholder.jpg";

  addToCart(
    title || variant.product?.title || "Activity Kit Bundle",
    price,
    "shopify-bundle",
    image,
    "",
    [
      {
        key: "Shopify Variant ID",
        value: variantId
      }
    ]
  );
}

  bundleCards.forEach((card) => {
    card.addEventListener("click", () => {
      const kit = card.dataset.kit;

      if (selectedKits.has(kit)) {
        selectedKits.delete(kit);
        card.classList.remove("active");
      } else {
        selectedKits.add(kit);
        card.classList.add("active");
      }

      updateBundleBuilder();
    });
  });

  bundleAddBtn.addEventListener("click", async () => {
    const variantId = bundleAddBtn.dataset.variantId;

    if (!variantId) {
      return;
    }

    try {
      await addShopifyVariantToLocalCart(
  variantId,
  bundleAddBtn.dataset.bundleTitle || "Activity Kit Bundle"
);
    } catch (error) {
      console.error("Add activity bundle failed:", error);
      alert("This bundle is not available right now.");
    }
  });

  updateBundleBuilder();
});

/* =========================
   SHOPIFY TEST — LOAD BUNDLE VARIANTS
========================= */

async function testShopifyBundleVariants() {
  const productHandle = "activity-kit-bundle-set-of-2";

  const query = `
    query getBundleProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        availableForSale
        variants(first: 20) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query, {
      handle: productHandle
    });

    const product = data.productByHandle;

    if (!product) {
      alert("Bundle product not found.");
      return;
    }

    console.log("SHOPIFY BUNDLE PRODUCT:", product);

    product.variants.edges.forEach((edge, index) => {
      const variant = edge.node;

      console.log(
        index + 1,
        "Variant title:",
        variant.title,
        "Variant ID:",
        variant.id,
        "Available:",
        variant.availableForSale,
        "Price:",
        variant.price.amount
      );
    });

    alert(
      "Bundle variants loaded. Check the console for variant names and IDs."
    );
  } catch (error) {
    console.error("Bundle variant test failed:", error);
    alert("Bundle variant test failed. Check console.");
  }
}

async function testShopifyBundleVariantsForSetOf3() {
  const productHandle =
    "activity-kit-bundle-set-of-3-complete-collection";

  const query = `
    query getBundleProduct($handle: String!) {
      productByHandle(handle: $handle) {
        title
        handle
        variants(first: 20) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, {
    handle: productHandle
  });

  data.productByHandle.variants.edges.forEach((edge) => {
    console.log(edge.node);
  });
}

/* =========================
   WOODEN LETTER BAG TAGS
========================= */

let selectedWoodenLetter = "";

document.addEventListener("DOMContentLoaded", () => {
  const letterButtons = document.querySelectorAll(".letter-btn");
  const selectedLetterNote = document.getElementById("selected-letter-note");

  if (!letterButtons.length || !selectedLetterNote) return;

  letterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedWoodenLetter = button.dataset.letter;

      letterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      selectedLetterNote.innerHTML =
        'Selected Letter: <span class="selected-letter-value">' +
        selectedWoodenLetter +
        '</span> ';
    });
  });
});

function addWoodenLetterTagToCart() {
  if (!selectedWoodenLetter) {
    alert("Please choose a letter first.");
    return;
  }

 addShopifyProductToLocalCart(
  "wooden-letter-bag-tag-add-on",
    [
      {
        key: "Letter",
        value: selectedWoodenLetter
      }
    ]
  );
}

document.addEventListener("click", (e) => {
  const readMoreBtn = e.target.closest(".description-read-more");

  const modal = document.getElementById("description-modal");
  const modalTitle = document.getElementById("description-modal-title");
  const modalText = document.getElementById("description-modal-text");

  if (readMoreBtn && modal && modalTitle && modalText) {
    modalTitle.textContent = readMoreBtn.dataset.title || "Product Details";
    modalText.textContent = readMoreBtn.dataset.description || "";
    modal.classList.add("show");
    return;
  }

  if (
    e.target.classList.contains("description-modal") ||
    e.target.classList.contains("description-modal-close")
  ) {
    modal?.classList.remove("show");
  }
});

/* =========================
   HALLOWEEN PRODUCT IMAGE + VARIANT SYNC
========================= */

function updateHalloweenSelection(variantTitle, imageSrc) {
  const mainImage = document.getElementById("shopify-main-image");
  const addBtn = document.getElementById("halloween-add-to-cart");

  if (mainImage && imageSrc) {
    mainImage.src = imageSrc;
  }

  if (addBtn && variantTitle) {
    addBtn.dataset.selectedVariantTitle = variantTitle;
  }

  document.querySelectorAll(".halloween-variant-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.variantTitle === variantTitle
    );
  });

  document.querySelectorAll(".product-thumb-btn").forEach((thumb) => {
    thumb.classList.toggle(
      "active",
      thumb.dataset.variantTitle === variantTitle
    );
  });
}

document.addEventListener("click", (e) => {
  const variantBtn = e.target.closest(".halloween-variant-btn");

  if (variantBtn) {
    updateHalloweenSelection(
      variantBtn.dataset.variantTitle,
      variantBtn.dataset.variantImage
    );
    return;
  }

  const thumbBtn = e.target.closest(".product-thumb-btn");

  if (thumbBtn) {
    updateHalloweenSelection(
      thumbBtn.dataset.variantTitle,
      thumbBtn.dataset.thumbImage
    );
  }
});

/* =========================
   HALLOWEEN SHOPIFY VARIANT IMAGES
========================= */

async function loadHalloweenVariantImages() {
  const page = document.querySelector(
    '[data-shopify-product="glow-in-the-dark-halloween-bag"]'
  );

  if (!page) return;

  try {
    const product = await getShopifyProductByHandle(
      "glow-in-the-dark-halloween-bag"
    );

    if (!product?.variants?.edges?.length) return;

    const normalize = (text = "") =>
      text.replace(/\s+/g, " ").trim().toLowerCase();

    const variantImageMap = {};

    product.variants.edges.forEach((edge) => {
      const variant = edge.node;

      if (!variant?.title || !variant?.image?.url) return;

      variantImageMap[normalize(variant.title)] = {
        title: variant.title,
        image: variant.image.url,
        alt: variant.image.altText || variant.title
      };
    });

    document.querySelectorAll(".halloween-variant-btn").forEach((btn) => {
      const match = variantImageMap[normalize(btn.dataset.variantTitle)];

      if (!match) return;

      btn.dataset.variantImage = match.image;
      btn.dataset.variantTitle = match.title;
    });

    document.querySelectorAll(".product-thumb-btn").forEach((thumb) => {
      const match = variantImageMap[normalize(thumb.dataset.variantTitle)];

      if (!match) return;

      thumb.dataset.thumbImage = match.image;
      thumb.dataset.variantTitle = match.title;

      const img = thumb.querySelector("img");

      if (img) {
        img.src = match.image;
        img.alt = match.alt;
      }
    });

    const activeBtn =
      document.querySelector(".halloween-variant-btn.active") ||
      document.querySelector(".halloween-variant-btn");

    if (activeBtn?.dataset.variantImage) {
      updateHalloweenSelection(
        activeBtn.dataset.variantTitle,
        activeBtn.dataset.variantImage
      );
    }
  } catch (error) {
    console.error("Halloween variant images failed to load:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadHalloweenVariantImages();
});

/* =========================
   HALLOWEEN ADD SELECTED VARIANT TO CART
========================= */

async function addHalloweenBagToCart() {
  const addBtn = document.getElementById("halloween-add-to-cart");
  if (!addBtn) return;

  const selectedTitle = addBtn.dataset.selectedVariantTitle;
  const handle = addBtn.dataset.shopifyHandle;

  if (!selectedTitle || !handle) {
    alert("Please choose a design first.");
    return;
  }

  try {
    const product = await getShopifyProductByHandle(handle);

    const normalize = (text = "") =>
      text.replace(/\s+/g, " ").trim().toLowerCase();

    const variantEdge = product?.variants?.edges?.find((edge) => {
      return normalize(edge.node.title) === normalize(selectedTitle);
    });

    const variant = variantEdge?.node;

    if (!variant || !variant.availableForSale) {
      alert("This design is not available right now.");
      return;
    }

    const image =
      variant.image?.url ||
      product.featuredImage?.url ||
      "images/placeholder.jpg";

    addToCart(
      `${product.title} - ${variant.title}`,
      Number(variant.price.amount),
      "shopify-variant",
      image,
      "",
      [
        {
          key: "Shopify Variant ID",
          value: variant.id
        },
        {
          key: "Design",
          value: variant.title
        }
      ]
    );

  } catch (error) {
    console.error("Halloween add to cart failed:", error);
    alert("Could not add this design to cart right now.");
  }
}

document.addEventListener("click", (e) => {
  const addBtn = e.target.closest("#halloween-add-to-cart");

  if (!addBtn) return;

  addHalloweenBagToCart();
});

/* =========================
   UNIVERSAL PRODUCT THUMBNAIL SWITCHING
   For all product pages using:
   .product-page + .product-thumb-btn + #shopify-main-image
========================= */

document.addEventListener("click", (e) => {
  const thumbBtn = e.target.closest(".product-page .product-thumb-btn");
  if (!thumbBtn) return;

  const productPage = thumbBtn.closest(".product-page");
  const mainImage = productPage?.querySelector("#shopify-main-image");

  if (!mainImage) return;

  const newImage =
    thumbBtn.dataset.thumbImage ||
    thumbBtn.querySelector("img")?.src;

  if (!newImage) return;

  mainImage.src = newImage;

  const newAlt = thumbBtn.querySelector("img")?.alt;
  if (newAlt) mainImage.alt = newAlt;

  productPage.querySelectorAll(".product-thumb-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  thumbBtn.classList.add("active");
});

/* =========================
   FOOTER RETURN LINK
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const helpSections = document.querySelectorAll(".home-footer h4");

  helpSections.forEach((heading) => {
    if (heading.textContent.trim().toLowerCase() !== "help") return;

    const helpBox = heading.parentElement;
    if (!helpBox) return;

    const alreadyExists = helpBox.querySelector(
      'a[href="https://kenzieprints-mlhtwcyt.myshopify.com/account/orders"]'
    );

    if (alreadyExists) return;

    const returnLink = document.createElement("a");
    returnLink.href = "https://kenzieprints-mlhtwcyt.myshopify.com/account/orders";
    returnLink.target = "_blank";
    returnLink.rel = "noopener";
    returnLink.textContent = "Returns & Cancellations";

    const contactLink = helpBox.querySelector('a[href="contact.html"]');

    if (contactLink) {
      helpBox.insertBefore(returnLink, contactLink);
    } else {
      helpBox.appendChild(returnLink);
    }
  });
});