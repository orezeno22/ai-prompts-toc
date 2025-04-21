(function() {
  // Check if the script has already run
  if (window.grokRequestsToCInitialized) {
    console.log('Content script already initialized, skipping re-initialization');
    return;
  }
  window.grokRequestsToCInitialized = true;

  // Function to index user requests
  function indexRequests() {
    // Select user messages based on provided DOM structure
    const userMessages = document.querySelectorAll('div.items-end div.message-bubble');
    const requests = [];
    
    console.log('Found messages:', userMessages.length, userMessages);
    
    userMessages.forEach((msg, index) => {
      // Assign a custom ID to avoid conflicts
      const customId = `ext-grok-request-${index}`;
      if (!msg.id) {
        msg.id = customId;
      }
      // Try to get text from nested elements if textContent is empty
      const textElement = msg.querySelector('p, span, div') || msg;
      const text = (textElement.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      console.log(`Message ${index} (ID: ${msg.id}):`, text);
      if (text) {
        requests.push({
          id: msg.id,
          text: text,
          index: index
        });
      }
    });
    
    console.log('Indexed requests:', requests);
    return requests;
  }

  // Initialize indexing with a delay to handle dynamic content
  setTimeout(() => {
    indexRequests();
  }, 2000);

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received:', request);
    if (request.action === 'getRequests') {
      const requests = indexRequests();
      console.log('Content script sending:', requests);
      sendResponse({ requests: requests, count: requests.length });
    } else if (request.action === 'scrollToRequest') {
      const element = document.getElementById(request.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.style.transition = 'background-color 0.5s';
        element.style.backgroundColor = '#e0f7fa';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 1000);
        sendResponse({ status: 'scrolled' });
      } else {
        console.log('Scroll failed: Element not found for ID', request.id);
        sendResponse({ status: 'element_not_found' });
      }
    } else if (request.action === 'ping') {
      sendResponse({ status: 'pong' });
    }
  });

  // Observe DOM changes to handle dynamic content
  if (!window.grokObserver) {
    window.grokObserver = new MutationObserver(() => {
      indexRequests();
    });
    window.grokObserver.observe(document.body, { childList: true, subtree: true });
    console.log('MutationObserver initialized');
  } else {
    console.log('MutationObserver already exists, reusing');
  }
})();