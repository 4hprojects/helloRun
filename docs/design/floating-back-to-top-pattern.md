# Floating Back-To-Top Button Pattern

## Purpose
- Reusable floating action button that appears after scroll and returns the user to the top of the page.
- Designed to be dropped into server-rendered or static projects with minimal dependencies.

## What This Pattern Includes
- Shared HTML button markup
- Reusable CSS for fixed positioning, visibility, hover, and focus states
- Lightweight JavaScript for scroll detection and smooth scrolling
- Optional icon support with Lucide

## Recommended Placement
- Put the button once in a shared layout file, typically near the end of `body`.
- This avoids duplicating the button across page templates.

## Markup
```html
<button type="button" class="global-back-to-top" id="globalBackToTopBtn" aria-label="Back to top">
  <i data-lucide="arrow-up"></i>
</button>
```

## CSS
```css
.global-back-to-top {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 1200;
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: linear-gradient(180deg, #c85a23 0%, #b74716 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease, background 0.2s ease;
}

.global-back-to-top.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.global-back-to-top:hover {
  background: linear-gradient(180deg, #b74716 0%, #913212 100%);
}

.global-back-to-top:focus-visible {
  outline: 2px solid #111827;
  outline-offset: 3px;
}

.global-back-to-top i {
  width: 1.05rem;
  height: 1.05rem;
}

@media (max-width: 768px) {
  .global-back-to-top {
    right: 1rem;
    bottom: 1rem;
    width: 2.85rem;
    height: 2.85rem;
  }
}
```

## JavaScript
```js
document.addEventListener('DOMContentLoaded', function () {
  const backToTopBtn = document.getElementById('globalBackToTopBtn');
  if (!backToTopBtn) return;

  const toggleBackToTop = () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toggleBackToTop();
});
```

## Accessibility Notes
- Use a real `button`, not a generic `div`.
- Keep `aria-label="Back to top"` even if an icon is used without text.
- Include a visible `:focus-visible` state for keyboard users.

## Integration Notes
- If the project uses Lucide, call `lucide.createIcons()` after render.
- If the project does not use Lucide, replace the `<i>` node with plain text or inline SVG.
- If a page has a large sticky footer/chat widget, increase `bottom` so controls do not collide.

## When To Keep It Shared
- Multi-page apps
- Server-rendered layouts
- Sites with shared footer/header templates

## When To Keep It Local
- One-off landing pages with fully custom visual language
- Pages that already have a fixed bottom CTA that would compete for the same corner

## helloRun Implementation Reference
- Shared markup: `src/views/layouts/footer.ejs`
- Shared CSS: `src/public/css/style.css`
- Shared JS: `src/public/js/main.js`
