import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';

/**
 * Dùng headless browser để truy cập trang SPX và bóc tách trạng thái đơn hàng
 * @param {string} trackingNumber - Mã vận đơn SPX (VD: SPXVN064280142929)
 * @returns {Promise<Object>} - Object chứa trạng thái và danh sách các mốc hành trình
 */
export async function scrapeSpxTracking(trackingNumber) {
  let browser = null;
  
  try {
    const isLocal = process.env.NODE_ENV === 'development';
    
    // Trên Vercel sẽ tự tải bộ Pack Chromium về /tmp để chạy, dung lượng rất nhỏ
    // Trên local sẽ dùng Chrome có sẵn ở máy tính
    const executablePath = isLocal 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
      : await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar');

    browser = await puppeteerCore.launch({
      args: isLocal ? puppeteerCore.defaultArgs() : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: isLocal ? false : chromium.headless,
    });

    const page = await browser.newPage();
    
    // Set User-Agent giả lập trình duyệt thật
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(`https://spx.vn/track?${trackingNumber}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Đợi cho phần tracking content load xong (tối đa 15 giây)
    await page.waitForSelector('.status-text, .tracking-content, .result-content, [class*="track"]', {
      timeout: 15000
    }).catch(() => {}); // Không lỗi nếu timeout, ta vẫn thử bóc tách

    // Đợi thêm 3 giây cho JS render hoàn tất
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Bóc tách dữ liệu từ trang
    const trackingData = await page.evaluate(() => {
      const result = {
        currentStatus: '',
        steps: []
      };

      // Lấy toàn bộ text trong body để debug
      const bodyText = document.body.innerText || '';

      // Tìm phần trạng thái hiện tại - thử nhiều selector phổ biến
      const statusSelectors = [
        '.status-text',
        '.tracking-status',
        '[class*="status"]',
        '[class*="Status"]'
      ];

      for (const sel of statusSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) {
          result.currentStatus = el.innerText.trim();
          break;
        }
      }

      // Tìm danh sách các mốc hành trình
      const stepSelectors = [
        '.tracking-item',
        '.tracking-step',
        '[class*="tracking"] li',
        '[class*="track"] [class*="item"]',
        '[class*="timeline"] [class*="item"]'
      ];

      for (const sel of stepSelectors) {
        const items = document.querySelectorAll(sel);
        if (items.length > 0) {
          items.forEach(item => {
            const text = item.innerText.trim();
            if (text) {
              result.steps.push(text);
            }
          });
          break;
        }
      }

      // Nếu không tìm được qua selector cụ thể, cố tìm trong toàn bộ body text
      if (!result.currentStatus && !result.steps.length) {
        // Tìm các dòng chứa từ khóa liên quan đến trạng thái giao hàng
        const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
        const keywords = ['giao', 'nhận', 'lấy', 'kho', 'đang', 'thành công', 'hoàn', 'transit', 'deliver', 'picked', 'warehouse', 'shipping'];
        
        const relevantLines = lines.filter(line => 
          keywords.some(kw => line.toLowerCase().includes(kw))
        );

        if (relevantLines.length > 0) {
          result.currentStatus = relevantLines[0];
          result.steps = relevantLines.slice(0, 10); // Lấy tối đa 10 mốc
        }

        // Fallback: lấy raw text nếu vẫn không có gì
        if (!result.currentStatus) {
          result.rawText = bodyText.substring(0, 2000); // Lấy 2000 ký tự đầu để debug
        }
      }

      return result;
    });

    return {
      success: true,
      trackingNumber,
      ...trackingData
    };
  } catch (error) {
    console.error(`Lỗi scrape SPX cho ${trackingNumber}:`, error);
    return {
      success: false,
      trackingNumber,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
