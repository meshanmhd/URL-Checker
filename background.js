const GOOGLE_API_KEY = "AIzaSyAHeko41LBcpoe6lFkbOIH1Gs4xC6Lu_5M";
const IPQS_API_KEY = "yVPkTJEeeDhaEhpAYlfUM7SafAc4gS6d";
const URLSCAN_API_KEY = "01982939-6e3e-75fe-ae03-37607b7e8e10";

// Listener for manual popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkUrl') {
    checkUrlCredibility(request.url)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => {
        console.error("Error in checkUrl:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Listener for tab changes (auto-trigger)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    console.log(`Checking URL on tab update: ${tab.url}`);
    const result = await checkUrlCredibility(tab.url);

    // Send in-page floating popup
    chrome.tabs.sendMessage(tabId, {
      action: 'showSiteStatus',
      unsafe: result.unsafe,
      url: tab.url
    });

    // Check notification toggle before showing notification
    chrome.storage.local.get('notificationsEnabled', (data) => {
      const allowNotification = data.notificationsEnabled !== false; // default true
      if (!allowNotification) {
        console.log("Notification skipped (toggle off).");
        return;
      }

      const title = result.unsafe
        ? '⚠️ Unsafe Website Detected!'
        : '✅ Safe Website';

      const message = result.unsafe
        ? `This site may be unsafe:\n${tab.url}`
        : `This site is safe:\n${tab.url}`;

      createNotification(title, message);
    });
  }
});

// Create Chrome notification
function createNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: title,
    message: message
  }, (id) => {
    if (chrome.runtime.lastError) {
      console.error("Notification Error:", chrome.runtime.lastError.message);
    } else {
      console.log("Notification created:", id);
    }
  });
}

// Master credibility checker
async function checkUrlCredibility(url) {
  const [googleSafe, ipqsResult, urlscanResult] = await Promise.all([
    checkGoogleSafeBrowsing(url),
    checkIPQS(url),
    checkURLScan(url)
  ]);

  console.log("Google Safe Browsing:", googleSafe);
  console.log("IPQS Result:", ipqsResult);
  console.log("URLScan Result:", urlscanResult);

  const ipqsUnsafe = ipqsResult?.success && (
    ipqsResult.risk_score > 75 ||
    ipqsResult.malicious ||
    ipqsResult.phishing
  );

  const urlscanUnsafe = urlscanResult?.verdict &&
    urlscanResult.verdict !== 'safe' &&
    urlscanResult.verdict !== 'unknown';

  const isUnsafe = googleSafe || ipqsUnsafe || urlscanUnsafe;

  return {
    unsafe: isUnsafe,
    details: {
      googleSafe,
      ipqsResult,
      urlscanResult
    }
  };
}

// Google Safe Browsing API check
async function checkGoogleSafeBrowsing(url) {
  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: "url-checker", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }]
          }
        })
      }
    );

    const data = await response.json();
    return data && data.matches ? true : false;
  } catch (err) {
    console.error("Google Safe Browsing Error:", err);
    return false;
  }
}

// IPQualityScore API check
async function checkIPQS(url) {
  try {
    const response = await fetch(
      `https://ipqualityscore.com/api/json/url/${IPQS_API_KEY}/${encodeURIComponent(url)}`
    );
    return await response.json();
  } catch (err) {
    console.error("IPQS Error:", err);
    return {
      success: false,
      risk_score: 0,
      malicious: false,
      phishing: false
    };
  }
}

// URLScan.io API check
async function checkURLScan(url) {
  try {
    const response = await fetch('https://urlscan.io/api/v1/scan/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': URLSCAN_API_KEY
      },
      body: JSON.stringify({ url, visibility: "public" })
    });

    if (!response.ok) return { verdict: 'unknown' };

    const submission = await response.json();
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait for scan

    const resultResponse = await fetch(submission.api);
    if (!resultResponse.ok) return { verdict: 'unknown' };

    const resultData = await resultResponse.json();
    const categories = resultData.verdicts?.overall?.categories;
    const verdict = categories?.[0] || 'safe';

    return { verdict };
  } catch (err) {
    console.error("URLScan Error:", err);
    return { verdict: 'unknown' };
  }
}
