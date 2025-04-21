// Fetch requests when popup is opened
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('requests-list');
  
  chrome.runtime.sendMessage({ action: 'getRequests' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Popup sendMessage error:', chrome.runtime.lastError.message);
      list.innerHTML = `<li class="error">Failed to load requests: ${chrome.runtime.lastError.message}</li>`;
      return;
    }
    
    console.log('Popup received:', response);
    if (!response || response.error) {
      list.innerHTML = `<li class="error">Failed to load requests: ${response?.error || 'Unknown error'}</li>`;
      return;
    }
    
    const requests = response.requests || [];
    if (requests.length === 0) {
      list.innerHTML = '<li class="no-requests">No requests found</li>';
      return;
    }
    
    requests.forEach((req) => {
      const li = document.createElement('li');
      li.textContent = req.text;
      li.title = req.text; // Full text on hover
      li.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'scrollToRequest', id: req.id }, (scrollResponse) => {
          if (chrome.runtime.lastError) {
            console.error('Popup scroll error:', chrome.runtime.lastError.message);
            return;
          }
          console.log('Scroll response:', scrollResponse);
        });
      });
      list.appendChild(li);
    });
  });
});