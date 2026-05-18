const STORAGE_KEYS = {
    CART: 'luxe_cart',
    CURRENCY: 'luxe_currency',
    PROMO: 'luxe_promo',
    COUNTRY: 'luxe_country'
};

const EXCHANGE_RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78
};

const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£'
};

const SHIPPING_RATES = {
    US: 10,
    CA: 15,
    UK: 20,
    OTHER: 25
};

const PROMO_CODES = {
    SAVE10: {
        type: 'percentage',
        value: 0.1,
        maxDiscount: 30,
        description: '减10%'
    },
    FREEship: {
        type: 'shipping',
        description: '免运费'
    }
};

const PRODUCTS = [
    {
        id: 'summer-breeze-dress',
        name: 'Summer Breeze 连衣裙',
        price: 89.00,
        maxStock: 20,
        category: '女装',
        description: '轻盈飘逸的夏季连衣裙，采用优质雪纺面料，透气舒适。简约优雅的设计，适合各种场合穿着。系带收腰设计，完美展现身材曲线。',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=1000&fit=crop'
        ],
        reviews: 128,
        sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
        id: 'elegant-blouse',
        name: '优雅真丝衬衫',
        price: 129.00,
        maxStock: 15,
        category: '女装',
        description: '采用100%桑蚕丝面料，光泽柔和，触感丝滑。经典版型设计，搭配精致领口细节，彰显优雅气质。',
        image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&h=1000&fit=crop'
        ],
        reviews: 89,
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'high-waist-skirt',
        name: '高腰半身裙',
        price: 79.00,
        maxStock: 25,
        category: '女装',
        description: '经典高腰设计，修身显瘦。优质混纺面料，垂坠感好，不易起皱。百搭款式，适合多种场合。',
        image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=1000&fit=crop'
        ],
        reviews: 156,
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 'leather-jacket',
        name: '经典皮衣外套',
        price: 299.00,
        maxStock: 10,
        category: '女装',
        description: '精选优质小羊皮，柔软舒适。经典机车款设计，金属拉链装饰，酷感十足。四季百搭单品。',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=800&h=1000&fit=crop'
        ],
        reviews: 203,
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'knit-sweater',
        name: '慵懒风针织衫',
        price: 95.00,
        maxStock: 30,
        category: '女装',
        description: '柔软羊毛混纺面料，温暖舒适。宽松慵懒版型，休闲时尚。多色可选，秋冬必备单品。',
        image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1584670747417-594a9412fba5?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1586878636873-3ae877b2c110?w=800&h=1000&fit=crop'
        ],
        reviews: 178,
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 'tailored-blazer',
        name: '修身西装外套',
        price: 189.00,
        maxStock: 18,
        category: '女装',
        description: '精致剪裁，修身显瘦。优质混纺面料，挺括有型。职场通勤必备，也可休闲搭配。',
        image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&h=1000&fit=crop'
        ],
        reviews: 145,
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'silk-scarf',
        name: '印花丝巾',
        price: 59.00,
        maxStock: 50,
        category: '配饰',
        description: '100%桑蚕丝材质，手感丝滑。精美印花图案，优雅复古。多种系法，搭配点睛之笔。',
        image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&h=1000&fit=crop'
        ],
        reviews: 92,
        sizes: ['均码']
    },
    {
        id: 'leather-bag',
        name: '复古手提包',
        price: 229.00,
        maxStock: 12,
        category: '配饰',
        description: '头层牛皮制作，质感十足。复古简约设计，容量适中。可手提可斜挎，实用百搭。',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=1000&fit=crop',
            'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=1000&fit=crop'
        ],
        reviews: 167,
        sizes: ['均码']
    }
];

const state = {
    cart: [],
    currency: 'USD',
    currentProduct: null,
    selectedSize: 'M',
    quantity: 1,
    appliedPromo: null,
    selectedCountry: 'US',
    isProductPage: false
};

const elements = {};

function getCurrentProduct() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (productId) {
        return PRODUCTS.find(p => p.id === productId);
    }
    return null;
}

function init() {
    cacheElements();
    loadFromStorage();
    
    state.isProductPage = document.getElementById('addToCartBtn') !== null;
    
    if (state.isProductPage) {
        state.currentProduct = getCurrentProduct();
        if (!state.currentProduct) {
            window.location.href = 'index.html';
            return;
        }
        renderProductDetail();
        bindProductEvents();
    } else {
        renderProductsGrid();
    }
    
    bindCommonEvents();
    render();
}

function cacheElements() {
    elements.cartBtn = document.getElementById('cartBtn');
    elements.cartCount = document.getElementById('cartCount');
    elements.cartDrawer = document.getElementById('cartDrawer');
    elements.cartOverlay = document.getElementById('cartOverlay');
    elements.closeCart = document.getElementById('closeCart');
    elements.cartItems = document.getElementById('cartItems');
    elements.cartEmpty = document.getElementById('cartEmpty');
    elements.subtotal = document.getElementById('subtotal');
    elements.shippingCost = document.getElementById('shippingCost');
    elements.discountRow = document.getElementById('discountRow');
    elements.discountAmount = document.getElementById('discountAmount');
    elements.total = document.getElementById('total');
    elements.countrySelect = document.getElementById('countrySelect');
    elements.currencySelect = document.getElementById('currencySelect');
    elements.promoCodeInput = document.getElementById('promoCodeInput');
    elements.applyPromoBtn = document.getElementById('applyPromoBtn');
    elements.promoError = document.getElementById('promoError');
    elements.appliedPromo = document.getElementById('appliedPromo');
    elements.promoTag = document.getElementById('promoTag');
    elements.removePromoBtn = document.getElementById('removePromoBtn');
    elements.checkoutBtn = document.getElementById('checkoutBtn');
    elements.paypalBtn = document.getElementById('paypalBtn');
    elements.toast = document.getElementById('toast');
    elements.productsGrid = document.getElementById('productsGrid');
    
    elements.mainProductImage = document.getElementById('mainProductImage');
    elements.flyingImage = document.getElementById('flyingImage');
    elements.thumbnailGallery = document.getElementById('thumbnailGallery');
    elements.productTitle = document.getElementById('productTitle');
    elements.reviewCount = document.getElementById('reviewCount');
    elements.priceValue = document.getElementById('priceValue');
    elements.productDescription = document.getElementById('productDescription');
    elements.productBreadcrumb = document.getElementById('productBreadcrumb');
    elements.sizeOptions = document.getElementById('sizeOptions');
    elements.decreaseQty = document.getElementById('decreaseQty');
    elements.increaseQty = document.getElementById('increaseQty');
    elements.quantityInput = document.getElementById('quantityInput');
    elements.addToCartBtn = document.getElementById('addToCartBtn');
    elements.stockInfo = document.getElementById('stockInfo');
}

function loadFromStorage() {
    const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
    if (savedCart) {
        state.cart = JSON.parse(savedCart);
    }

    const savedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    if (savedCurrency && EXCHANGE_RATES[savedCurrency]) {
        state.currency = savedCurrency;
    }

    const savedPromo = localStorage.getItem(STORAGE_KEYS.PROMO);
    if (savedPromo && PROMO_CODES[savedPromo]) {
        state.appliedPromo = savedPromo;
    }

    const savedCountry = localStorage.getItem(STORAGE_KEYS.COUNTRY);
    if (savedCountry && SHIPPING_RATES[savedCountry]) {
        state.selectedCountry = savedCountry;
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state.cart));
    localStorage.setItem(STORAGE_KEYS.CURRENCY, state.currency);
    localStorage.setItem(STORAGE_KEYS.PROMO, state.appliedPromo || '');
    localStorage.setItem(STORAGE_KEYS.COUNTRY, state.selectedCountry);
}

function bindCommonEvents() {
    elements.cartBtn.addEventListener('click', openCart);
    elements.closeCart.addEventListener('click', closeCart);
    elements.cartOverlay.addEventListener('click', closeCart);

    if (elements.countrySelect) {
        elements.countrySelect.addEventListener('change', (e) => {
            state.selectedCountry = e.target.value;
            saveToStorage();
            updateCartSummary();
        });
    }

    if (elements.currencySelect) {
        elements.currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            saveToStorage();
            render();
        });
    }

    if (elements.applyPromoBtn) {
        elements.applyPromoBtn.addEventListener('click', applyPromoCode);
    }
    
    if (elements.promoCodeInput) {
        elements.promoCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyPromoCode();
        });
    }
    
    if (elements.removePromoBtn) {
        elements.removePromoBtn.addEventListener('click', removePromoCode);
    }

    if (elements.checkoutBtn) {
        elements.checkoutBtn.addEventListener('click', () => {
            if (state.cart.length > 0) {
                window.location.href = 'checkout.html';
            }
        });
    }

    if (elements.paypalBtn) {
        elements.paypalBtn.addEventListener('click', handlePayPalPayment);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.cartDrawer.classList.contains('active')) {
            closeCart();
        }
    });
}

function bindProductEvents() {
    if (!elements.sizeOptions) return;

    elements.sizeOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('size-btn')) {
            selectSize(e.target.dataset.size);
        }
    });

    if (elements.decreaseQty) {
        elements.decreaseQty.addEventListener('click', () => changeQuantity(-1));
    }
    if (elements.increaseQty) {
        elements.increaseQty.addEventListener('click', () => changeQuantity(1));
    }
    if (elements.quantityInput) {
        elements.quantityInput.addEventListener('change', handleQuantityInput);
    }

    if (elements.addToCartBtn) {
        elements.addToCartBtn.addEventListener('click', handleAddToCart);
    }

    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            if (elements.mainProductImage) {
                elements.mainProductImage.src = thumb.dataset.full;
            }
        });
    });
}

function renderProductDetail() {
    const product = state.currentProduct;
    document.title = `${product.name} | LUXE`;
    
    elements.productTitle.textContent = product.name;
    elements.reviewCount.textContent = `(${product.reviews} 条评价)`;
    elements.priceValue.textContent = formatPrice(product.price);
    elements.priceValue.dataset.usd = product.price;
    elements.productDescription.textContent = product.description;
    elements.productBreadcrumb.innerHTML = `<a href="index.html">首页</a> / ${product.category} / ${product.name}`;
    
    elements.mainProductImage.src = product.gallery[0];
    elements.mainProductImage.alt = product.name;
    
    elements.thumbnailGallery.innerHTML = product.gallery.map((img, idx) => `
        <img src="${img.replace('w=800&h=1000', 'w=200&h=200')}" alt="缩略图${idx + 1}" 
             class="thumbnail ${idx === 0 ? 'active' : ''}" data-full="${img}">
    `).join('');
    
    elements.sizeOptions.innerHTML = product.sizes.map(size => `
        <button class="size-btn ${size === 'M' ? 'active' : ''}" data-size="${size}">${size}</button>
    `).join('');
    
    state.selectedSize = product.sizes.includes('M') ? 'M' : product.sizes[0];
    updateStockInfo();
}

function renderProductsGrid() {
    if (!elements.productsGrid) return;
    
    elements.productsGrid.innerHTML = PRODUCTS.map(product => `
        <a href="product.html?id=${product.id}" class="product-card">
            <div class="product-card-image">
                <img src="${product.image}" alt="${product.name}">
                <div class="product-card-overlay">
                    <span class="quick-view">查看详情</span>
                </div>
            </div>
            <div class="product-card-info">
                <h3 class="product-card-name">${product.name}</h3>
                <div class="product-card-rating">
                    <span class="stars">★★★★★</span>
                    <span class="review-count">(${product.reviews})</span>
                </div>
                <p class="product-card-price" data-usd="${product.price}">${formatPrice(product.price)}</p>
            </div>
        </a>
    `).join('');
}

function selectSize(size) {
    state.selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === size);
    });
}

function changeQuantity(delta) {
    const newQty = Math.max(1, Math.min(10, state.quantity + delta));
    state.quantity = newQty;
    elements.quantityInput.value = newQty;
    updateStockInfo();
}

function handleQuantityInput(e) {
    let value = parseInt(e.target.value) || 1;
    value = Math.max(1, Math.min(10, value));
    state.quantity = value;
    e.target.value = value;
    updateStockInfo();
}

function updateStockInfo() {
    if (!state.currentProduct) return;
    const totalInCart = getTotalQuantityInCartForProduct(state.currentProduct.id);
    const available = state.currentProduct.maxStock - totalInCart;
    elements.stockInfo.textContent = `库存: ${available > 0 ? available : 0} 件`;
}

function getTotalQuantityInCartForProduct(productId) {
    return state.cart
        .filter(item => item.productId === productId)
        .reduce((sum, item) => sum + item.quantity, 0);
}

function getTotalQuantityInCart() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotalItems() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function handleAddToCart() {
    const product = state.currentProduct;
    const totalInCart = getTotalQuantityInCartForProduct(product.id);
    const available = product.maxStock - totalInCart;

    if (available <= 0) {
        showToast('库存不足，无法添加更多商品', 'error');
        return;
    }

    const actualQty = Math.min(state.quantity, available);
    if (actualQty < state.quantity) {
        showToast(`库存仅剩 ${available} 件，已添加最大可用数量`, 'error');
    }

    const existingItem = state.cart.find(
        item => item.productId === product.id && item.size === state.selectedSize
    );

    if (existingItem) {
        existingItem.quantity += actualQty;
    } else {
        state.cart.push({
            id: Date.now(),
            productId: product.id,
            name: product.name,
            price: product.price,
            size: state.selectedSize,
            quantity: actualQty,
            image: product.image
        });
    }

    saveToStorage();
    playFlyAnimation();
    showToast('已添加到购物车', 'success');
    render();

    setTimeout(() => {
        openCart();
    }, 800);
}

function playFlyAnimation() {
    if (!elements.mainProductImage) return;
    const img = elements.mainProductImage;
    const flyingImg = elements.flyingImage;
    
    flyingImg.style.backgroundImage = `url(${img.src})`;
    flyingImg.style.left = '50%';
    flyingImg.style.top = '50%';
    flyingImg.style.transform = 'translate(-50%, -50%)';
    flyingImg.classList.add('animate');

    setTimeout(() => {
        flyingImg.classList.remove('animate');
    }, 800);
}

function removeFromCart(itemId) {
    state.cart = state.cart.filter(item => item.id !== itemId);
    saveToStorage();
    render();
    if (state.isProductPage) {
        updateStockInfo();
    }
}

function updateItemQuantity(itemId, delta) {
    const item = state.cart.find(i => i.id === itemId);
    if (!item) return;

    const product = PRODUCTS.find(p => p.id === item.productId);
    if (!product) return;

    const totalInCartForProduct = getTotalQuantityInCartForProduct(item.productId);
    const available = product.maxStock - (totalInCartForProduct - item.quantity);

    if (delta > 0 && item.quantity + 1 > available) {
        showToast('库存不足', 'error');
        return;
    }

    item.quantity = Math.max(1, Math.min(10, item.quantity + delta));
    saveToStorage();
    render();
    if (state.isProductPage) {
        updateStockInfo();
    }
}

function openCart() {
    elements.cartDrawer.classList.add('active');
    elements.cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    elements.cartDrawer.classList.remove('active');
    elements.cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function applyPromoCode() {
    const code = elements.promoCodeInput.value.trim().toUpperCase();
    elements.promoError.textContent = '';

    if (!code) {
        elements.promoError.textContent = '请输入优惠码';
        return;
    }

    if (state.appliedPromo) {
        elements.promoError.textContent = '已有优惠码正在使用中，请先移除';
        return;
    }

    if (!PROMO_CODES[code]) {
        elements.promoError.textContent = '无效的优惠码';
        return;
    }

    state.appliedPromo = code;
    elements.promoCodeInput.value = '';
    saveToStorage();
    render();
    showToast(`优惠码 ${code} 已应用`, 'success');
}

function removePromoCode() {
    state.appliedPromo = null;
    saveToStorage();
    render();
    showToast('优惠码已移除', 'success');
}

function handlePayPalPayment() {
    if (state.cart.length === 0) {
        showToast('购物车是空的', 'error');
        return;
    }
    
    window.location.href = 'checkout.html';
}

function calculateSubtotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function calculateShipping() {
    if (state.cart.length === 0) return 0;
    return SHIPPING_RATES[state.selectedCountry] || 0;
}

function calculateDiscount() {
    if (!state.appliedPromo) return 0;

    const promo = PROMO_CODES[state.appliedPromo];
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();

    if (promo.type === 'percentage') {
        const discount = subtotal * promo.value;
        return Math.min(discount, promo.maxDiscount);
    } else if (promo.type === 'shipping') {
        return shipping;
    }

    return 0;
}

function calculateTotal() {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    const discount = calculateDiscount();
    const total = subtotal + shipping - discount;
    return Math.max(0, total);
}

function formatPrice(usdAmount) {
    const converted = usdAmount * EXCHANGE_RATES[state.currency];
    const symbol = CURRENCY_SYMBOLS[state.currency];
    return `${symbol}${converted.toFixed(2)}`;
}

function render() {
    updateCurrencySelect();
    updateCountrySelect();
    updateCartCount();
    renderCartItems();
    updateCartSummary();
    if (state.isProductPage) {
        updateProductPrice();
    }
}

function updateCurrencySelect() {
    if (elements.currencySelect) {
        elements.currencySelect.value = state.currency;
    }
}

function updateCountrySelect() {
    if (elements.countrySelect) {
        elements.countrySelect.value = state.selectedCountry;
    }
}

function updateCartCount() {
    const count = getCartTotalItems();
    elements.cartCount.textContent = count;
    elements.cartCount.style.display = count > 0 ? 'flex' : 'none';
}

function updateProductPrice() {
    if (state.currentProduct && elements.priceValue) {
        elements.priceValue.textContent = formatPrice(state.currentProduct.price);
    }
}

function renderCartItems() {
    if (state.cart.length === 0) {
        elements.cartEmpty.style.display = 'flex';
        elements.cartItems.style.display = 'none';
        if (elements.checkoutBtn) elements.checkoutBtn.disabled = true;
        if (elements.paypalBtn) elements.paypalBtn.style.opacity = '0.5';
        return;
    }

    elements.cartEmpty.style.display = 'none';
    elements.cartItems.style.display = 'block';
    if (elements.checkoutBtn) elements.checkoutBtn.disabled = false;
    if (elements.paypalBtn) elements.paypalBtn.style.opacity = '1';

    elements.cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-size">尺码: ${item.size}</span>
                <span class="cart-item-price">${formatPrice(item.price)}</span>
            </div>
            <div class="cart-item-actions">
                <button class="remove-item-btn" data-id="${item.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <div class="cart-item-qty">
                    <button data-action="decrease" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button data-action="increase" data-id="${item.id}">+</button>
                </div>
            </div>
        </div>
    `).join('');

    elements.cartItems.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
    });

    elements.cartItems.querySelectorAll('.cart-item-qty button').forEach(btn => {
        btn.addEventListener('click', () => {
            const delta = btn.dataset.action === 'increase' ? 1 : -1;
            updateItemQuantity(parseInt(btn.dataset.id), delta);
        });
    });
}

function updateCartSummary() {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    const discount = calculateDiscount();
    const total = calculateTotal();

    elements.subtotal.textContent = formatPrice(subtotal);
    elements.shippingCost.textContent = state.cart.length > 0 ? formatPrice(shipping) : formatPrice(0);

    if (state.appliedPromo) {
        elements.discountRow.style.display = 'flex';
        elements.discountAmount.textContent = `-${formatPrice(discount)}`;
        elements.appliedPromo.style.display = 'flex';
        elements.promoTag.textContent = `${state.appliedPromo} - ${PROMO_CODES[state.appliedPromo].description}`;
    } else {
        elements.discountRow.style.display = 'none';
        elements.appliedPromo.style.display = 'none';
    }

    elements.total.textContent = formatPrice(total);
}

function showToast(message, type = 'default') {
    elements.toast.textContent = message;
    elements.toast.className = 'toast';
    if (type !== 'default') {
        elements.toast.classList.add(type);
    }
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
