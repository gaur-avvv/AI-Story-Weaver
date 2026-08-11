import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('error', err => console.log('PAGE CRASH:', err.message));
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.log("Goto error:", e.message);
  }
  await new Promise(r => setTimeout(r, 1000));
  try {
    await page.click('a[href="#/library"]');
  } catch (e) {
    try {
      await page.click('a[href="/library"]');
    } catch(e) {}
  }
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
  process.exit(0);
})();
