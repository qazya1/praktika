import { clientLogin, createOrder, getMenu, Product, resolveMediaUrl } from './api';

const app = document.querySelector<HTMLElement>('#app')!;
const cart = new Map<number, number>();
let products: Product[] = [];
let token = '';
let activeCategory = 'Все';

const money = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char] || char));
const cartCount = () => [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
const cartTotal = () => products.reduce((sum, product) => sum + Number(product.price) * (cart.get(product.id) || 0), 0);
const categories = () => ['Все', ...new Set(products.map(product => product.category))];

function productCard(product: Product): string {
  const quantity = cart.get(product.id) || 0;
  return `<article class="product-card">
    <div class="product-media">
      <img src="${esc(resolveMediaUrl(product.image_url))}" alt="${esc(product.name)}" loading="lazy"
        onerror="this.onerror=null;this.src='/images/products/fallback.svg'">
      ${product.category === 'Шаурма' ? '<span class="product-badge">Хит</span>' : ''}
    </div>
    <div class="product-body">
      <div class="product-copy">
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description)}</p>
      </div>
      <div class="product-bottom">
        <strong class="price">${money(Number(product.price))}</strong>
        ${quantity === 0
          ? `<button class="add-button" data-plus="${product.id}">Добавить</button>`
          : `<div class="counter" aria-label="Количество ${esc(product.name)}">
              <button data-minus="${product.id}" aria-label="Уменьшить">−</button>
              <span>${quantity}</span>
              <button data-plus="${product.id}" aria-label="Добавить">+</button>
            </div>`}
      </div>
    </div>
  </article>`;
}

function render(): void {
  const visible = activeCategory === 'Все'
    ? products
    : products.filter(product => product.category === activeCategory);

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#top" aria-label="На главную">
        <img src="/images/logo.svg" alt="Шаурма рядом">
      </a>
      <div class="topbar-meta">
        <span class="work-dot"></span>
        <span>Открыто до 23:00</span>
      </div>
    </header>

    <main id="top">
      <section class="hero-shell">
        <div class="hero-copy">
          <span class="eyebrow">СВЕЖЕЕ · ГОРЯЧЕЕ · РЯДОМ</span>
          <h1>Закажи любимую шаурму без очереди</h1>
          <p>Соберём заказ заранее. Останется только забрать его в заведении.</p>
          <div class="hero-points">
            <span>🔥 Готовим после заказа</span>
            <span>⏱ От 15 минут</span>
          </div>
          <a class="hero-button" href="#menu">Смотреть меню</a>
        </div>
        <div class="hero-art"><img src="/images/hero-food.svg" alt="Шаурма и картофель"></div>
      </section>

      <section class="menu-section" id="menu">
        <div class="section-heading">
          <div><span class="eyebrow dark">МЕНЮ</span><h2>Что приготовить?</h2></div>
          <span class="menu-count">${products.length} позиций</span>
        </div>
        <nav class="category-tabs" aria-label="Категории">
          ${categories().map(category => `<button class="category-tab ${category === activeCategory ? 'active' : ''}" data-category="${esc(category)}">${esc(category)}</button>`).join('')}
        </nav>
        <div class="product-grid">
          ${visible.map(productCard).join('') || '<div class="empty-state">В этой категории пока ничего нет</div>'}
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <img src="/images/logo.svg" alt="">
      <p>Учебная версия системы заказов для Telegram и MAX.</p>
      <a href="/staff.html">Вход для сотрудников</a>
    </footer>

    <aside class="cartbar ${cartCount() ? 'visible' : ''}" aria-live="polite">
      <div class="cart-summary">
        <span class="cart-count">${cartCount()}</span>
        <div><small>Ваш заказ</small><strong>${money(cartTotal())}</strong></div>
      </div>
      <button data-checkout>Оформить</button>
    </aside>`;
}

function selectedItems(): Array<{ product: Product; quantity: number }> {
  return [...cart.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ product: products.find(product => product.id === id)!, quantity }))
    .filter(item => Boolean(item.product));
}

function checkout(): void {
  const items = selectedItems();
  if (!items.length) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" data-modal>
      <form class="sheet" data-form>
        <div class="sheet-handle"></div>
        <button type="button" class="close" data-close aria-label="Закрыть">×</button>
        <div class="sheet-title"><span class="eyebrow dark">ОФОРМЛЕНИЕ</span><h2>Проверьте заказ</h2></div>
        <div class="checkout-items">
          ${items.map(({ product, quantity }) => `<div class="checkout-item">
            <img src="${esc(resolveMediaUrl(product.image_url))}" alt="">
            <div><strong>${esc(product.name)}</strong><span>${quantity} × ${money(Number(product.price))}</span></div>
            <b>${money(Number(product.price) * quantity)}</b>
          </div>`).join('')}
        </div>
        <div class="checkout-fields">
          <label><span>Ваше имя</span><input name="name" required minlength="2" value="Демо пользователь" autocomplete="name"></label>
          <label><span>Телефон</span><input name="phone" type="tel" placeholder="+7 900 000-00-00" autocomplete="tel"></label>
        </div>
        <div class="pickup-note"><span>📍</span><div><strong>Самовывоз</strong><small>Заказ можно забрать после смены статуса на «Готов»</small></div></div>
        <div class="summary"><span>Итого</span><strong>${money(cartTotal())}</strong></div>
        <button class="primary" type="submit"><span>Создать заказ</span><strong>${money(cartTotal())}</strong></button>
        <p class="form-error" data-error></p>
      </form>
    </div>`);

  const modal = document.querySelector<HTMLElement>('[data-modal]')!;
  const close = () => modal.remove();
  modal.querySelector('[data-close]')?.addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.querySelector<HTMLFormElement>('[data-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const submit = formElement.querySelector<HTMLButtonElement>('.primary')!;
    const form = new FormData(formElement);
    const error = modal.querySelector<HTMLElement>('[data-error]')!;
    submit.disabled = true;
    submit.innerHTML = '<span>Создаём заказ…</span>';
    try {
      const order = await createOrder(token, {
        customer_name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity }))
      });
      modal.querySelector('.sheet')!.innerHTML = `
        <div class="success-view">
          <div class="success">✓</div>
          <span class="eyebrow dark">ЗАКАЗ ПРИНЯТ</span>
          <h2>Заказ №${order.id} создан</h2>
          <p>Мы уже передали его сотрудникам. Сумма заказа — <strong>${money(order.total)}</strong>.</p>
          <button type="button" class="primary" data-done>Вернуться в меню</button>
        </div>`;
      modal.querySelector('[data-done]')?.addEventListener('click', () => {
        cart.clear(); close(); render();
      });
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : 'Не удалось создать заказ';
      submit.disabled = false;
      submit.innerHTML = `<span>Создать заказ</span><strong>${money(cartTotal())}</strong>`;
    }
  });
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const category = target.closest<HTMLButtonElement>('[data-category]');
  const plus = target.closest<HTMLElement>('[data-plus]');
  const minus = target.closest<HTMLElement>('[data-minus]');

  if (category) {
    activeCategory = category.dataset.category || 'Все';
    render();
    document.querySelector('#menu')?.scrollIntoView({ block: 'start' });
    return;
  }
  if (plus) cart.set(Number(plus.dataset.plus), (cart.get(Number(plus.dataset.plus)) || 0) + 1);
  if (minus) cart.set(Number(minus.dataset.minus), Math.max(0, (cart.get(Number(minus.dataset.minus)) || 0) - 1));
  if (plus || minus) render();
  if (target.closest('[data-checkout]')) checkout();
});

async function start(): Promise<void> {
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
  window.WebApp?.enableClosingConfirmation?.();
  try {
    [products, token] = await Promise.all([getMenu(), clientLogin()]);
    render();
  } catch (reason) {
    app.innerHTML = `<div class="center-error"><img src="/images/logo.svg" alt="Шаурма рядом"><h1>Не удалось открыть меню</h1><p>${esc(reason instanceof Error ? reason.message : '')}</p><button onclick="location.reload()">Попробовать снова</button></div>`;
  }
}

void start();
