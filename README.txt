STATIC DEPLOY (No-CDN, No Inline JS)

Files:
- index.html  (links local styles.css and app.js)
- styles.css  (local stylesheet)
- app.js      (vanilla JS app)

How to deploy on Netlify / Cloudflare Pages / GitHub Pages:
1) Upload the folder as-is. No build step required.
2) The site's entry is index.html at the root.
3) After deploy you get a URL like: https://your-calculator.netlify.app/

Embed in WordPress (Block editor Shortcode or Elementor HTML widget):
<iframe
  loading="lazy"
  src="https://your-calculator.netlify.app/index.html"
  style="width:100%;height:1200px;border:0;border-radius:12px;box-shadow:0 1px 4px rgba(15,23,42,.08);"
  title="Event Budgeting Calculator">
</iframe>
