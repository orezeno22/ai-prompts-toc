(function() {
  // Check if the script has already run
  if (window.grokRequestsToCInitialized) {
    console.log('Content script already initialized, skipping re-initialization');
    return;
  }
  window.grokRequestsToCInitialized = true;

  // Function to index user requests
  function indexRequests() {
    // Select user messages using items-end and message-bubble
    const userMessages = document.querySelectorAll('div.items-end .message-bubble');
    const requests = [];
    
    // Log the raw NodeList for debugging
    console.log('Found messages with selector div.items-end .message-bubble:', userMessages.length, userMessages);
    
    // Safeguard: Check if userMessages is valid
    if (!userMessages || userMessages.length === 0) {
      console.log('No valid user messages found with selector: div.items-end .message-bubble');
      return [];
    }
    
    userMessages.forEach((msg, index) => {
      // Assign a custom ID to the message-bubble div for scrolling
      const customId = `ext-grok-request-${index}`;
      if (!msg.id) {
        msg.id = customId;
      }
      // Extract text from the nested p tag within response-content-markdown
      const textElement = msg.querySelector('div.response-content-markdown p') || msg;
      const text = (textElement.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      console.log(`Message ${index} (ID: ${msg.id}, Text Element:`, textElement, `Text:`, text);
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

  // Initialize indexing with a longer delay to handle dynamic content
  setTimeout(() => {
    const requests = indexRequests();
    console.log('Initial indexing result:', requests);
  }, 10000); // Increased to 10 seconds

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
    const chatContainer = document.querySelector('.chat-container') || document.querySelector('div.relative') || document.body;
    window.grokObserver = new MutationObserver(() => {
      const requests = indexRequests();
      console.log('MutationObserver triggered, indexed requests:', requests);
    });
    window.grokObserver.observe(chatContainer, { childList: true, subtree: true });
    console.log('MutationObserver initialized on:', chatContainer);
  } else {
    console.log('MutationObserver already exists, reusing');
  }
})();