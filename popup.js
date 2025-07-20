document.addEventListener('DOMContentLoaded', async () => {
  const resultElement = document.getElementById('result');
  const checkmarkElement = document.getElementById('checkmark');
  const detailsElement = document.getElementById('details');
  const toggleElement = document.getElementById('notifyToggle');

  // Load toggle state
  chrome.storage.local.get('notificationsEnabled', (data) => {
    toggleElement.checked = data.notificationsEnabled !== false;
  });

  // Save toggle changes
  toggleElement.addEventListener('change', () => {
    chrome.storage.local.set({ notificationsEnabled: toggleElement.checked });
  });

  resultElement.textContent = 'Checking...';
  checkmarkElement.textContent = '⏳';
  detailsElement.textContent = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    chrome.runtime.sendMessage({ action: 'checkUrl', url }, (response) => {
      if (chrome.runtime.lastError) {
        resultElement.textContent = 'Error contacting background.';
        checkmarkElement.textContent = '❌';
        return;
      }

      if (!response || !response.success) {
        resultElement.textContent = '❌ Error checking URL.';
        checkmarkElement.textContent = '❌';
        return;
      }

      const isUnsafe = response.unsafe;
      resultElement.textContent = isUnsafe ? '⚠️ This site may be unsafe!' : '✅ This URL is Safe.';
      checkmarkElement.textContent = isUnsafe ? '' : '';
      detailsElement.textContent = JSON.stringify(response.details, null, 2);
    });
  } catch (err) {
    resultElement.textContent = 'Unexpected error occurred.';
    checkmarkElement.textContent = '❌';
  }
});
