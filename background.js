// Function to inject content script if not already present
function ensureContentScript(tabId, callback) {
  // Send a test message to see if the content script is running
  chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Content script not running, injecting now:', chrome.runtime.lastError.message);
      // Inject the content script
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to inject content script:', chrome.runtime.lastError.message);
          callback(false);
          return;
        }
        console.log('Content script injected successfully');
        // Wait briefly to ensure the content script is ready
        setTimeout(() => callback(true), 100);
      });
    } else {
      console.log('Content script already running');
      callback(true);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRequests' || request.action === 'scrollToRequest') {
    console.log('Background received:', request);
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('No active tab found');
        sendResponse({ error: 'No active tab found' });
        return;
      }
      const tab = tabs[0];
      // Check if the tab URL matches https://grok.com/*
      if (!tab.url || !tab.url.startsWith('https://grok.com/')) {
        console.error('Active tab is not on https://grok.com:', tab.url);
        sendResponse({ error: 'Please open the popup on https://grok.com' });
        return;
      }
      // Ensure the content script is running before sending the message
      ensureContentScript(tab.id, (isContentScriptRunning) => {
        if (!isContentScriptRunning) {
          sendResponse({ error: 'Failed to inject content script' });
          return;
        }
        // Forward the message to the content script
        chrome.tabs.sendMessage(tab.id, request, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to content script:', chrome.runtime.lastError.message);
            sendResponse({ error: 'Content script not available: ' + chrome.runtime.lastError.message });
            return;
          }
          console.log('Background forwarding response:', response);
          sendResponse(response);
        });
      });
    });
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});