chrome.runtime.onInstalled.addListener(() => {
    // Extension installed or updated logic here
    console.log('Extension installed or updated.');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    // skip urls like "chrome://" to avoid extension error
    if (tab.url?.startsWith('chrome://')) return undefined;

    if (changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: checkAndLogin,
            args: [tabId]
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'closeTab') {
        chrome.tabs.remove(message.tabId);
    }
});

async function checkAndLogin(tabId) {
    try {
        const currentURL = window.location.href;
        // Check if the current tab URL contains 'device.sso.*.awamazon.com'
        const isSSOPage = currentURL.includes('device.sso') && currentURL.includes('amazonaws.com');
        if (isSSOPage) {
            const loginButton =  await waitForElement(() => document.getElementById('cli_verification_btn'));
            if (loginButton) {
                // Click the 'cli_verification_btn'
                loginButton.click();
                console.log('Clicked on cli_verification_btn');
            }
        }
        // Check if the current tab URL contains 'awsapps.com' and 'start'
        const isUserConsentPage = currentURL.includes('awsapps.com') && currentURL.includes('start');
        if (isUserConsentPage) {
            const loginButtonAfterRedirection = await waitForElement(() => document.getElementById('cli_login_button'));
            // check if the 'cli_login_button' exists
            if (loginButtonAfterRedirection) {
                // Click the 'cli_login_button'
                loginButtonAfterRedirection.click();
                console.log('Clicked on cli_login_button new page');
                chrome.runtime.sendMessage({ action: 'closeTab', tabId: tabId });
            }
        }
        // Check if the current tab URL contains 'awsapps.com' and 'start'
        // this function is used if the button id changes and will find the english text in the button to allow access
        const isNewUserConsentPage = currentURL.includes('awsapps.com') && currentURL.includes('start');
        if (isNewUserConsentPage) {
            const allowButton = await waitForElement(() => {
                const button = document.querySelector('button[data-testid="allow-access-button"]');

                if (button?.textContent.toLowerCase().includes('allow access')) {
                    return button;
                }
            });

            if (allowButton) {
                allowButton.click();
                console.log('Clicked on Allow access button');

                await waitForElement(() => document.querySelector('.awsui-context-alert')?.textContent.toLocaleLowerCase().startsWith('request approved'));

                chrome.runtime.sendMessage({ action: 'closeTab', tabId: tabId });
            }
        }

    } catch (error) {
        console.error('An error occurred:', error);
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForElement(fn, timeout = 1500) {
        const startTime = Date.now();

        do {
            const result = fn();
            if (result) {
                return result;
            }

            await wait(100);
        } while (Date.now() - startTime < timeout);
    }
}
