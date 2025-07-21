document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleLaser');
  const colorPicker = document.getElementById('colorPicker');
  const lengthSlider = document.getElementById('lengthSlider');
  const saveButton = document.getElementById('saveSettings');

  // Load current settings
  chrome.storage.local.get(['laserEnabled', 'laserColor', 'trailLength'], (data) => {
    toggleButton.textContent = data.laserEnabled ? 'Disable Laser Pointer' : 'Enable Laser Pointer';
    colorPicker.value = data.laserColor || '#ff0000';
    lengthSlider.value = data.trailLength || 40;
  });

  toggleButton.addEventListener('click', () => {
    chrome.storage.local.get('laserEnabled', (data) => {
      const newState = !data.laserEnabled;
      
      // Update storage first
      chrome.storage.local.set({ laserEnabled: newState }, () => {
        toggleButton.textContent = newState ? 'Disable Laser Pointer' : 'Enable Laser Pointer';
        
        // Ensure content script is ready before sending message
        chrome.runtime.sendMessage({ type: 'ENSURE_CONTENT_SCRIPT' }, (response) => {
          if (response && response.contentScriptReady) {
            // Content script is ready, send the toggle message
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                  type: 'TOGGLE_LASER', 
                  enabled: newState 
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.log('Content script not ready, relying on storage listener');
                  }
                });
              }
            });
          }
        });
        
        // Close popup after a short delay
        setTimeout(() => window.close(), 100);
      });
    });
  });

  saveButton.addEventListener('click', () => {
    const color = colorPicker.value;
    const length = parseInt(lengthSlider.value);
    
    // Save to storage
    chrome.storage.local.set({ laserColor: color, trailLength: length }, () => {
      // Ensure content script is ready before sending message
      chrome.runtime.sendMessage({ type: 'ENSURE_CONTENT_SCRIPT' }, (response) => {
        if (response && response.contentScriptReady) {
          // Content script is ready, send the update message
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_SETTINGS',
                color,
                trailLength: length
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.log('Content script not ready, settings saved to storage');
                }
              });
            }
          });
        }
      });
      
      // Close popup after a short delay
      setTimeout(() => window.close(), 100);
    });
  });
});