// ─── 1. HEADER CLOCK & GREETING ───
function updateHeader() {
    const now  = new Date();
    const hour = now.getHours();
    const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    document.getElementById('greeting').innerText = `${greet}, Jid`;
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-NG', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ─── 2. WEATHER ───
const regions = [
    { name: "Lagos",         lat: 6.52,  lon: 3.37,  emoji: "🌆" },
    { name: "Abuja",         lat: 9.07,  lon: 7.39,  emoji: "🏛"  },
    { name: "Kano",          lat: 12.00, lon: 8.59,  emoji: "🏜" },
    { name: "Port Harcourt", lat: 4.81,  lon: 7.04,  emoji: "⚓" }
];
const weatherDesc = code => {
    if (code === 0) return "Clear";
    if (code <= 3)  return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    if (code <= 82) return "Showers";
    return "Stormy";
};
async function fetchWeather() {
    const list = document.getElementById('weather-list');
    try {
        let html = '';
        for (const city of regions) {
            const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`);
            const data = await res.json();
            const temp = Math.round(data.current_weather.temperature);
            const desc = weatherDesc(data.current_weather.weathercode);
            html += `<div class="row"><span>${city.emoji} ${city.name}</span><div style="text-align:right"><span class="weather-temp">${temp}°C</span><div style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">${desc}</div></div></div>`;
            if (city.name === "Lagos") {
                const txt = `🇳🇬 LAGOS ${temp}°C · ${desc}`;
                document.getElementById('ticker-weather').innerText  = txt;
                document.getElementById('ticker-weather2').innerText = txt;
            }
        }
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">Weather offline</p>';
    }
}

// ─── 3. NAIRA RATES ───
async function updateNairaRates() {
    const el = document.getElementById('fx-timestamp');
    try {
        const cached = localStorage.getItem('jid_fx');
        if (cached) {
            const { rates, ts } = JSON.parse(cached);
            if (Date.now() - ts < 3600000) { applyRates(rates); if (el) el.innerText='Cached'; return; }
        }
        const res  = await fetch('https://open.er-api.com/v6/latest/NGN');
        const data = await res.json();
        if (data && data.rates) {
            const rates = { usd: Math.round(1/data.rates.USD), gbp: Math.round(1/data.rates.GBP), eur: Math.round(1/data.rates.EUR) };
            localStorage.setItem('jid_fx', JSON.stringify({ rates, ts: Date.now() }));
            applyRates(rates);
            const now = new Date();
            if (el) el.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
    } catch (e) {
        applyRates({ usd: 1583, gbp: 2011, eur: 1742 });
        if (el) el.innerText = 'Approx';
    }
}
function applyRates(r) {
    document.getElementById('usd-ngn').innerText = `₦${r.usd.toLocaleString()}`;
    document.getElementById('gbp-ngn').innerText = `₦${r.gbp.toLocaleString()}`;
    document.getElementById('eur-ngn').innerText = `₦${r.eur.toLocaleString()}`;
}

// ─── 4. CRYPTO ───
async function fetchCrypto() {
    const cryptoList = document.getElementById('crypto-list');
    try {
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,manchester-city-fan-token&vs_currencies=usd,ngn&include_24hr_change=true');
        const data = await res.json();
        const assets = [
            { id:'bitcoin', name:'BTC' }, { id:'ethereum', name:'ETH' },
            { id:'solana', name:'SOL' }, { id:'manchester-city-fan-token', name:'CITY' }
        ];
        let html = '';
        assets.forEach(asset => {
            const val = data[asset.id]; if (!val) return;
            const change = val.usd_24h_change ? val.usd_24h_change.toFixed(2) : '0.00';
            const dir = parseFloat(change) >= 0 ? 'up' : 'down';
            const arrow = parseFloat(change) >= 0 ? '▲' : '▼';
            html += `<div class="crypto-row"><span class="crypto-name">${asset.name}</span><div class="crypto-prices"><div class="crypto-usd ${dir}">$${Number(val.usd).toLocaleString()}</div><div class="crypto-ngn">₦${Number(val.ngn).toLocaleString()}</div></div><span class="badge ${dir}">${arrow} ${Math.abs(change)}%</span></div>`;
        });
        cryptoList.innerHTML = html;
    } catch (e) {
        cryptoList.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;padding-top:8px">Market unavailable</p>';
    }
}

// ─── 5. MAN CITY — AUTO FROM city.json ───
// HOW TO UPDATE AFTER EACH MATCH:
//   Open city.json in GitHub, update "last" with the result and "next" with the upcoming fixture, commit.
//   The dashboard refreshes automatically. Takes about 30 seconds.
let countdownInterval = null;

async function fetchCityData() {
    try {
        const bust = Math.floor(Date.now() / 300000); // cache bust every 5 min
        const res  = await fetch(`./city.json?v=${bust}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        applyLastResult(data.last);
        applyNextMatch(data.next);
    } catch (e) {
        // Hardcoded fallback — update city.json to avoid this
        applyLastResult({ opponent:'Liverpool', cityScore:4, oppScore:0, competition:'FA Cup QF', note:'Haaland hat-trick ⚽⚽⚽' });
        applyNextMatch({ opponent:'Chelsea', competition:'Premier League', datetime:'2026-04-12T15:30:00Z', venue:'Etihad Stadium' });
    }
}

function applyLastResult(d) {
    const won  = d.cityScore > d.oppScore;
    const drew = d.cityScore === d.oppScore;
    document.getElementById('last-result-opp').innerText  = d.opponent;
    document.getElementById('city-score').innerText       = d.cityScore;
    document.getElementById('opp-score').innerText        = d.oppScore;
    document.getElementById('city-score').className       = won ? 'result-win' : (drew ? '' : 'result-loss');
    document.getElementById('opp-score').className        = won ? 'result-loss' : (drew ? '' : 'result-win');
    document.getElementById('last-result-comp').innerText = `${d.competition}${d.note ? ' · '+d.note : ''}`;
    const emoji  = won ? '✅' : drew ? '🤝' : '❌';
    const ticker = `🏆 FT: Man City ${d.cityScore}–${d.oppScore} ${d.opponent} (${d.competition}) ${emoji}`;
    document.getElementById('ticker-match').innerText  = ticker;
    document.getElementById('ticker-match2').innerText = ticker;
}

function applyNextMatch(d) {
    const kickoff = new Date(d.datetime);
    document.getElementById('hero-opponent').innerText = d.opponent;
    document.getElementById('hero-meta').innerText = `${d.competition} · ${formatWAT(kickoff)} · ${d.venue || 'Etihad Stadium'}`;
    const t = `⚽ NEXT: Man City vs ${d.opponent} (${d.competition}) · ${formatWAT(kickoff)}`;
    document.getElementById('ticker-next').innerText  = t;
    document.getElementById('ticker-next2').innerText = t;
    startCountdown(kickoff);
}

function formatWAT(date) {
    const d     = new Date(date);
    const wat   = new Date(d.getTime() + 3600000); // UTC+1
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hh    = wat.getUTCHours();
    const mm    = wat.getUTCMinutes();
    const ampm  = hh >= 12 ? 'PM' : 'AM';
    const h12   = hh % 12 || 12;
    const min   = mm > 0 ? `:${String(mm).padStart(2,'0')}` : '';
    return `${days[wat.getUTCDay()]} ${months[wat.getUTCMonth()]} ${wat.getUTCDate()} · ${h12}${min} ${ampm} WAT`;
}

function startCountdown(targetDate) {
    if (countdownInterval) clearInterval(countdownInterval);
    function tick() {
        const gap = new Date(targetDate).getTime() - Date.now();
        if (gap <= 0) {
            document.getElementById('countdown').innerText      = 'MATCHDAY! 🔵';
            document.getElementById('countdown-secs').innerText = 'Come on City!';
            document.getElementById('countdown-label').innerText= "It's time —";
            return;
        }
        const d = Math.floor(gap/86400000);
        const h = Math.floor((gap%86400000)/3600000);
        const m = Math.floor((gap%3600000)/60000);
        const s = Math.floor((gap%60000)/1000);
        document.getElementById('countdown').innerText =
            `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
        document.getElementById('countdown-secs').innerText = `${String(s).padStart(2,'0')}s remaining`;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
}

// ─── 6. SAVINGS SIMULATOR ───
function calculateSavings() {
    const P      = parseFloat(document.getElementById('sim-initial').value)  || 0;
    const PMT    = parseFloat(document.getElementById('sim-deposit').value)  || 0;
    const r      = parseFloat(document.getElementById('sim-strategy').value) || 0.15;
    const months = parseInt(document.getElementById('sim-months').value)     || 8;
    const n = 12, t = months / 12;
    const futurePrincipal = P   * Math.pow((1+r/n), n*t);
    const futureAnnuity   = PMT * ((Math.pow((1+r/n), n*t) - 1) / (r/n));
    const totalWealth     = futurePrincipal + futureAnnuity;
    const totalDeposited  = P + (PMT * months);
    const interestEarned  = totalWealth - totalDeposited;
    const returnPct       = totalDeposited > 0 ? ((interestEarned/totalDeposited)*100).toFixed(1) : 0;
    const pctP = totalWealth > 0 ? (P/totalWealth*100).toFixed(1) : 0;
    const pctD = totalWealth > 0 ? ((PMT*months)/totalWealth*100).toFixed(1) : 0;
    const pctI = totalWealth > 0 ? (interestEarned/totalWealth*100).toFixed(1) : 0;
    const fmt  = (n, dec=0) => `₦${Math.max(n,0).toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec})}`;
    document.getElementById('sim-total').innerText           = fmt(totalWealth, 2);
    document.getElementById('sim-interest-earned').innerText = fmt(interestEarned);
    document.getElementById('sim-deposited').innerText       = fmt(totalDeposited);
    document.getElementById('sim-return-pct').innerText      = `+${returnPct}%`;
    document.getElementById('sim-duration').innerText        = `${months} month${months>1?'s':''}`;
    setTimeout(() => {
        document.getElementById('sim-bar-principal').style.width = pctP + '%';
        document.getElementById('sim-bar-deposits').style.width  = pctD + '%';
        document.getElementById('sim-bar-interest').style.width  = pctI + '%';
    }, 80);
}

// ─── 7. TOOL SWITCHER ───
function showTool(name, btn) {
    document.querySelectorAll('.tool-frame').forEach(f => f.classList.remove('active-frame'));
    document.querySelectorAll('.tool-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + name).classList.add('active-frame');
    btn.classList.add('active');
}

// ─── 8. ABOUT MODAL ───
function openAbout()  { document.getElementById('aboutModal').classList.add('open');    document.body.style.overflow='hidden'; }
function closeAbout() { document.getElementById('aboutModal').classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('click',   e => { if (e.target.id==='aboutModal') closeAbout(); });
document.addEventListener('keydown', e => { if (e.key==='Escape') closeAbout(); });

// ─── BOOT ───
updateHeader();
setInterval(updateHeader, 1000);
updateNairaRates();
fetchCityData();
fetchWeather();
fetchCrypto();
setInterval(fetchCrypto, 60000);
calculateSavings();
['sim-deposit','sim-initial','sim-strategy','sim-months'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', calculateSavings);
});
