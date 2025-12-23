// ==========================================
// ⚠️ تنظیمات SUPABASE - این بخش را پر کنید ⚠️
// ==========================================
const SUPABASE_URL = 'https://kpzzfsyzqkvuypseccri.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_SO025VlsajUKd5lhl7CBwg_9nvrHvm-'; 
// ==========================================

// راه اندازی کلاینت Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let username = "";

// المان‌های صفحه
const loginScreen = document.getElementById("login-screen");
const mainInterface = document.getElementById("main-interface");
const usernameInput = document.getElementById("username-input");
const msgInput = document.getElementById("msg-input");
const chatHistory = document.getElementById("chat-history");

// -------------------------------------------------
// توابع مربوط به ورود (Login)
// -------------------------------------------------
function enterChat() {
    const val = usernameInput.value.trim();
    if (val !== "") {
        username = val.toUpperCase(); // تبدیل به حروف بزرگ برای حالت هکری
        
        // تغییر وضعیت نمایش
        loginScreen.style.display = "none";
        mainInterface.style.display = "flex";
        
        // آپدیت کردن پرامپت
        document.getElementById("prompt-label").innerText = `${username}@OFOQ:~#`;
        
        msgInput.focus();
        
        // شروع دریافت پیام‌ها
        initSupabaseListeners();
    } else {
        alert("ERROR: IDENTITY REQUIRED");
    }
}

// -------------------------------------------------
// توابع مربوط به Supabase (ارسال و دریافت)
// -------------------------------------------------

async function initSupabaseListeners() {
    // ۱. دریافت پیام‌های قبلی (لود تاریخچه)
    const { data, error } = await _supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true }) // پیام‌های قدیمی اول بیایند
        .limit(50);

    if (error) console.error("Error loading history:", error);
    if (data) {
        data.forEach(msg => renderMessage(msg));
    }

    // ۲. گوش دادن به پیام‌های جدید (Realtime)
    _supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            renderMessage(payload.new);
        })
        .subscribe();
}

async function sendMessage() {
    const text = msgInput.value;

    if (text.trim() !== "") {
        // خالی کردن فیلد ورودی بلافاصله برای حس سرعت
        msgInput.value = ""; 

        // ارسال به دیتابیس
        const { error } = await _supabase
            .from('messages')
            .insert({ username: username, text: text });
        
        if (error) {
            console.error("Transmission failed:", error);
            alert("ERROR: TRANSMISSION FAILED");
        }
    }
}

// -------------------------------------------------
// توابع نمایش (UI)
// -------------------------------------------------
function renderMessage(data) {
    // تبدیل زمان به فرمت قابل خواندن
    const date = new Date(data.created_at);
    const timeStr = `[${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}]`;

    const div = document.createElement("div");
    div.className = "msg-line";
    
    // ساختار HTML پیام
    div.innerHTML = `<span class="timestamp">${timeStr}</span> <span class="user-label">${data.username}:</span> ${escapeHtml(data.text)}`;
    
    chatHistory.appendChild(div);
    
    // اسکرول خودکار به پایین
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// جلوگیری از حملات XSS (امنیت)
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -------------------------------------------------
// رویدادهای دکمه‌ها و کیبورد
// -------------------------------------------------
document.getElementById("login-btn").addEventListener("click", enterChat);
document.getElementById("send-btn").addEventListener("click", sendMessage);

// زدن اینتر در فیلد ورود
usernameInput.addEventListener("keypress", (e) => { 
    if(e.key === "Enter") enterChat(); 
});

// زدن اینتر در فیلد پیام
msgInput.addEventListener("keypress", (e) => { 
    if(e.key === "Enter") sendMessage(); 
});
