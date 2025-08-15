const puppeteer = require('puppeteer');
const assert = require('assert');

(async () => {
  const widths = [375, 768, 1024];
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  for (const width of widths) {
    await page.setViewport({ width, height: 800 });
    await page.goto(`file://${process.cwd()}/index.html`);

    const diff = await page.evaluate(() => {
      const th = document.querySelector('#inventoryTable th[data-column="name"]');
      const icon = th.querySelector('.header-icon');
      const text = th.querySelector('.header-text');
      const iconRect = icon.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      const iconCenter = iconRect.left + iconRect.width / 2;
      const textCenter = textRect.left + textRect.width / 2;
      return Math.abs(iconCenter - textCenter);
    });

    console.log(`width ${width} center diff ${diff.toFixed(2)}`);
    assert.ok(diff < 1, `Center diff ${diff}px exceeds 1px at width ${width}`);
  }

  await browser.close();
  console.log('Name header centered across widths');
})();

