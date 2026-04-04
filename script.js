// ─── 1. HEADER CLOCK & GREETING ───
function updateHeader() {
    const now = new Date();
    const hour = now.getHours();
    const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    document.getElementById('greeting').innerText = `${greet}, Jid`;
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── 2. WEATHER ───
const regions = [
    { name: "Lagos", lat: 6.52, lon: 3.37, emoji: "🌆" },
    { name: "Abuja", lat: 9.07, lon: 7.39, emoji: "🏛" },
    { name: "Kano", lat: 12.00, lon: 8.59, emoji: "🏜" },
    { name: "Port Harcourt", lat: 4.81, lon: 7.04, emoji: "⚓" }
];

const weatherDesc = (code) => {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    if (code <= 82) return "Showers";
    return "Stormy";
};

async function fetchWeather() {
    const list = document.getElementById('weather-list');
    const tickerWeather = document.getElementById('ticker-weather');
    try {
        let html = '';
        for (let city of regions) {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`);
            const data = await res.json();
            const temp = Math.round(data.current_weather.temperature);
            const desc = weatherDesc(data.current_weather.weathercode);
            html += `
                <div class="row">
                    <span>${city.emoji} ${city.name}</span>
                    <div style="text-align:right">
                        <span class="weather-temp">${temp}°C</span>
                        <div style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">${desc}</div>
                    </div>
                </div>`;
            if (city.name === "Lagos") {
                tickerWeather.innerText = `🇳🇬 LAGOS ${temp}°C · ${desc}`;
            }
        }
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">Weather offline</p>';
    }
}

// ─── 3. NAIRA RATES (static with timestamp) ───
function updateNairaRates() {
    const rates = { usd: 1583.50, gbp: 2011.25, eur: 1742.00 };
    document.getElementById('usd-ngn').innerText = `₦${rates.usd.toLocaleString()}`;
    document.getElementById('gbp-ngn').innerText = `₦${rates.gbp.toLocaleString()}`;
    document.getElementById('eur-ngn').innerText = `₦${rates.eur.toLocaleString()}`;
    const now = new Date();
    const ts = `${now.getDate()} Apr '${String(now.getFullYear()).slice(2)}`;
    const el = document.getElementById('fx-timestamp');
    if (el) el.innerText = `As of ${ts}`;
}

// ─── 4. CRYPTO ───
async function fetchCrypto() {
    const cryptoList = document.getElementById('crypto-list');
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,manchester-city-fan-token&vs_currencies=usd,ngn&include_24hr_change=true');
        const data = await res.json();
        const assets = [
            { id: 'bitcoin', name: 'BTC', icon: '₿' },
            { id: 'ethereum', name: 'ETH', icon: 'Ξ' },
            { id: 'solana', name: 'SOL', icon: '◎' },
            { id: 'manchester-city-fan-token', name: 'CITY', icon: '🔵' }
        ];

        let html = '';
        assets.forEach(asset => {
            const val = data[asset.id];
            if (!val) return;
            const change = val.usd_24h_change ? val.usd_24h_change.toFixed(2) : '0.00';
            const dir = parseFloat(change) >= 0 ? 'up' : 'down';
            const arrow = parseFloat(change) >= 0 ? '▲' : '▼';
            html += `
                <div class="crypto-row">
                    <span class="crypto-name">${asset.name}</span>
                    <div class="crypto-prices">
                        <div class="crypto-usd ${dir}">$${Number(val.usd).toLocaleString()}</div>
                        <div class="crypto-ngn">₦${Number(val.ngn).toLocaleString()}</div>
                    </div>
                    <span class="badge ${dir}">${arrow} ${Math.abs(change)}%</span>
                </div>`;
        });
        cryptoList.innerHTML = html;
    } catch (e) {
        cryptoList.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;padding-top:8px">Market unavailable</p>';
    }
}

// ─── 5. COUNTDOWN ───
const matchDay = new Date("April 12, 2026 16:30:00").getTime();
function runCountdown() {
    const now = new Date().getTime();
    const gap = matchDay - now;
    if (gap <= 0) {
        document.getElementById('countdown').innerText = "MATCHDAY";
        return;
    }
    const d = Math.floor(gap / (1000 * 60 * 60 * 24));
    const h = Math.floor((gap % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((gap % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((gap % (1000 * 60)) / 1000);
    document.getElementById('countdown').innerText = `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
    document.getElementById('countdown-secs').innerText = `${String(s).padStart(2,'0')}s remaining`;
}

// ─── 6. TOOL SWITCHER ───
function showTool(name, btn) {
    document.querySelectorAll('.tool-frame').forEach(f => f.classList.remove('active-frame'));
    document.querySelectorAll('.tool-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + name).classList.add('active-frame');
    btn.classList.add('active');
}

// ─── BOOT ───
updateHeader(); setInterval(updateHeader, 1000);
updateNairaRates();
runCountdown(); setInterval(runCountdown, 1000);
fetchWeather();
fetchCrypto(); setInterval(fetchCrypto, 60000);
