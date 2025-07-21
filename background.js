chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ laserEnabled: false });

  // Inject content script into all existing tabs
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url && /^https?:/.test(tab.url)) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(err => console.warn('Script injection failed on tab', tab.id, err));

        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles.css']
        }).catch(err => console.warn('CSS injection failed on tab', tab.id, err));
      }
    }
  });
});


// Handle messages from popup and inject content script if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ENSURE_CONTENT_SCRIPT') {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        
        try {
          // Try to ping the content script first
          const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
          sendResponse({ contentScriptReady: true });
        } catch (error) {
          // Content script not ready, inject it
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            });
            
            // Also inject CSS
            await chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['styles.css']
            });
            
            // Wait a bit for injection to complete
            setTimeout(() => {
              sendResponse({ contentScriptReady: true, injected: true });
            }, 100);
          } catch (injectionError) {
            console.error('Failed to inject content script:', injectionError);
            sendResponse({ contentScriptReady: false, error: injectionError.message });
          }
        }
      }
    });
    
    return true; // Keep the message channel open for async response
  }
});

chrome.runtime.onSuspend.addListener(() => {
  // Optional: clean up if needed
});