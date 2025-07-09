const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the local site
    await page.goto('http://localhost:1313');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take a full page screenshot
    await page.screenshot({ 
      path: 'full-page-screenshot.png', 
      fullPage: true 
    });
    
    console.log('Full page screenshot taken: full-page-screenshot.png');
    
    // Look for sales performance section (checking various possible selectors)
    const salesSectionSelectors = [
      '[class*="sales"]',
      '[class*="performance"]',
      '[class*="result"]',
      '[class*="achievement"]',
      '[class*="card"]',
      '.grid',
      '.flex',
      'section'
    ];
    
    let salesSection = null;
    for (const selector of salesSectionSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          // Look for text content that might indicate sales section
          for (const element of elements) {
            const text = await element.textContent();
            if (text && (text.includes('Amazon') || text.includes('メルカリ') || text.includes('Yahoo') || text.includes('販売') || text.includes('実績'))) {
              salesSection = element;
              console.log(`Found potential sales section with selector: ${selector}`);
              break;
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
      if (salesSection) break;
    }
    
    if (salesSection) {
      // Take a screenshot of the sales section
      await salesSection.screenshot({ path: 'sales-section-screenshot.png' });
      console.log('Sales section screenshot taken: sales-section-screenshot.png');
      
      // Get information about the cards layout
      const cardsInfo = await page.evaluate(() => {
        const cards = [];
        
        // Look for elements containing Amazon, メルカリ, Yahoo
        const textToFind = ['Amazon', 'メルカリ', 'Yahoo'];
        
        textToFind.forEach(text => {
          const elements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.includes(text) && 
            el.children.length === 0 // leaf node
          );
          
          elements.forEach(el => {
            // Find the card container (parent with specific styling)
            let cardContainer = el;
            while (cardContainer && cardContainer.parentElement) {
              const styles = window.getComputedStyle(cardContainer);
              if (styles.display === 'block' || styles.display === 'flex' || 
                  cardContainer.classList.toString().includes('card') ||
                  cardContainer.classList.toString().includes('grid') ||
                  cardContainer.classList.toString().includes('col')) {
                break;
              }
              cardContainer = cardContainer.parentElement;
            }
            
            const rect = cardContainer.getBoundingClientRect();
            cards.push({
              text: text,
              element: cardContainer.tagName,
              classes: cardContainer.className,
              position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              visible: rect.width > 0 && rect.height > 0
            });
          });
        });
        
        return cards;
      });
      
      console.log('Cards information:', JSON.stringify(cardsInfo, null, 2));
      
      // Check if cards are displayed horizontally
      if (cardsInfo.length >= 3) {
        const yPositions = cardsInfo.map(card => card.position.y);
        const isHorizontal = Math.max(...yPositions) - Math.min(...yPositions) < 50; // within 50px vertically
        console.log(`Cards layout: ${isHorizontal ? 'Horizontal' : 'Vertical'}`);
        console.log(`Found ${cardsInfo.length} cards with sales platform names`);
      }
    } else {
      console.log('Sales section not found. Taking screenshots of potential card containers...');
      
      // Look for grid or flex containers that might contain the cards
      const containerSelectors = ['.grid', '.flex', '[class*="grid"]', '[class*="flex"]', '.row', '.cards'];
      
      for (let i = 0; i < containerSelectors.length; i++) {
        const selector = containerSelectors[i];
        try {
          const containers = await page.$$(selector);
          if (containers.length > 0) {
            await containers[0].screenshot({ path: `container-${i}-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png` });
            console.log(`Container screenshot taken: container-${i}-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png`);
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();