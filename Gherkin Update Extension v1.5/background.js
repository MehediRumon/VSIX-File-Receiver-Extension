
let isEnabled = false;
let elementClassName = 'ElementClass';
let menuName = '';
let pageClassName = 'PageClass';

chrome.storage.sync.get(['extensionEnabled', 'elementClassName', 'menuName', 'pageClassName'], (result) => {
    isEnabled = result.extensionEnabled ?? false;
    elementClassName = result.elementClassName || elementClassName;
    menuName = result.menuName || '';
    pageClassName = result.pageClassName || pageClassName;
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggle') {
        isEnabled = message.value;
    } else if (message.action === 'setClassName') {
        elementClassName = message.value;
        chrome.storage.sync.set({ elementClassName });
    } else if (message.action === 'setPageClassName') {
        pageClassName = message.value;
        chrome.storage.sync.set({ pageClassName });
    } else if (message.action === 'setMenuName') {
        menuName = message.value;
        chrome.storage.sync.set({ menuName });
    } else if (message.action === 'reset') {
        chrome.storage.sync.set({
            collectedLocators: [],
            collectedGherkinSteps: [],
            collectedMethods: [],
            collectedParamValues: [] 
        }, () => {
            chrome.storage.local.set({ urls: [], actions: [] });
        });
    }

});

function extractAction(url) {
    try {
        const pathSegments = new URL(url).pathname.split('/');
        return pathSegments.pop() || pathSegments.pop(); // handle trailing slash
    } catch (e) {
        return 'Unknown';
    }
}

// Store request payloads temporarily
const requestPayloads = new Map();

// Clean up old payloads every 5 minutes to prevent memory leaks
setInterval(() => {
    // Keep only recent payloads (older than 5 minutes will be removed)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [requestId, data] of requestPayloads.entries()) {
        if (data.timestamp < fiveMinutesAgo) {
            requestPayloads.delete(requestId);
        }
    }
}, 5 * 60 * 1000);

// Listen for request bodies (payloads)
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.requestBody) {
            let payload = null;
            
            try {
                // Handle form data
                if (details.requestBody.formData) {
                    payload = details.requestBody.formData;
                }
                // Handle raw data (JSON, XML, etc.)
                else if (details.requestBody.raw && details.requestBody.raw.length > 0) {
                    try {
                        const decoder = new TextDecoder('utf-8');
                        const rawData = details.requestBody.raw.map(data => {
                            if (data.bytes) {
                                return decoder.decode(new Uint8Array(data.bytes));
                            }
                            return '';
                        }).join('');
                        
                        if (rawData.trim()) {
                            // Try to parse as JSON for better formatting
                            try {
                                payload = JSON.parse(rawData);
                            } catch {
                                // If not JSON, keep as string
                                payload = rawData;
                            }
                        }
                    } catch (e) {
                        payload = '[Unable to decode payload]';
                    }
                }
                
                if (payload) {
                    requestPayloads.set(details.requestId, {
                        payload: payload,
                        timestamp: Date.now()
                    });
                }
            } catch (e) {
                // Log error but don't break the extension
                console.warn('Error processing request payload:', e);
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
    function (details) {
        chrome.storage.local.get(['loggingEnabled', 'urls', 'filterDomain', 'actions'], (data) => {
            if (!data.loggingEnabled) return;

            const domainFilter = (data.filterDomain || '').trim().toLowerCase();
            if (domainFilter && !details.url.toLowerCase().includes(domainFilter)) return;

            const action = extractAction(details.url);
            let urls = data.urls || [];
            const actions = new Set(data.actions || []);

            const exists = urls.some(u => u.url === details.url && u.method === details.method);
            if (exists) return;

            // Get the payload if it exists
            const payloadData = requestPayloads.get(details.requestId);
            const payload = payloadData ? payloadData.payload : null;
            
            const requestData = {
                action,
                url: details.url,
                method: details.method,
                time: new Date().toLocaleTimeString(),
                payload: payload || null
            };

            urls.push(requestData);
            actions.add(action);

            // Clean up the payload from memory
            requestPayloads.delete(details.requestId);

            chrome.storage.local.set({
                urls,
                actions: Array.from(actions)
            });
        });
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);
