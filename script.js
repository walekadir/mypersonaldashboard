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
    { name: "Lagos",        lat: 6.52,  lon: 3.37,  emoji: "🌆" },
    { name: "Abuja",        lat: 9.07,  lon: 7.39,  emoji: "🏛" },
    { name: "Kano",         lat: 12.00, lon: 8.59,  emoji: "🏜" },
    { name: "Port Harcourt",lat: 4.81,  lon: 7.04,  emoji: "⚓" }
];

const weatherDesc = (code) => {
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
    const tickerWeather  = document.getElementById('ticker-weather');
    const tickerWeather2 = document.getElementById('ticker-weather2');
    try {
        let html = '';
        for (let city of regions) {
            const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`);
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
                const txt = `🇳🇬 LAGOS ${temp}°C · ${desc}`;
                tickerWeather.innerText  = txt;
                tickerWeather2.innerText = txt;
            }
        }
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">Weather offline</p>';
    }
}

// ─── 3. NAIRA RATES (live via open.er-api.com, fallback to static) ───
async function updateNairaRates() {
    const el = document.getElementById('fx-timestamp');
    try {
        const cached = localStorage.getItem('jid_fx');
        if (cached) {
            const { rates, ts } = JSON.parse(cached);
            if (Date.now() - ts < 3600000) {   // 1-hour cache
                applyRates(rates);
                if (el) el.innerText = `Cached`;
                return;
            }
        }
        const res  = await fetch('https://open.er-api.com/v6/latest/NGN');
        const data = await res.json();
        if (data && data.rates) {
            const rates = {
                usd: Math.round(1 / data.rates.USD),
                gbp: Math.round(1 / data.rates.GBP),
                eur: Math.round(1 / data.rates.EUR),
            };
            localStorage.setItem('jid_fx', JSON.stringify({ rates, ts: Date.now() }));
            applyRates(rates);
            const now = new Date();
            if (el) el.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
    } catch (e) {
        // fallback
        applyRates({ usd: 1583, gbp: 2011, eur: 1742 });
        if (el) el.innerText = `Approx`;
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
            { id: 'bitcoin',                   name: 'BTC',  icon: '₿'  },
            { id: 'ethereum',                  name: 'ETH',  icon: 'Ξ'  },
            { id: 'solana',                    name: 'SOL',  icon: '◎'  },
            { id: 'manchester-city-fan-token', name: 'CITY', icon: '🔵' }
        ];
        let html = '';
        assets.forEach(asset => {
            const val = data[asset.id];
            if (!val) return;
            const change = val.usd_24h_change ? val.usd_24h_change.toFixed(2) : '0.00';
            const dir    = parseFloat(change) >= 0 ? 'up' : 'down';
            const arrow  = parseFloat(change) >= 0 ? '▲' : '▼';
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

// ─── 5. MAN CITY — AUTO FIXTURE + RESULT ───
//
// Uses football-data.org free tier (no API key required for Man City / PL).
// Man City team ID = 65.  PL competition = PL.  FA Cup = FAC.
//
// HOW IT WORKS:
//   1. Fetch the last 5 finished Man City matches → show most recent result
//   2. Fetch next 5 scheduled Man City matches   → show next fixture + countdown
//   3. If the API fails (CORS, rate-limit, etc.) → fall back to hardcoded values
//      so the dashboard never breaks.
//
// NOTE: football-data.org has a 10-req/min limit on the free tier.
// We cache both fetches in localStorage for 30 minutes.

const CITY_TEAM_ID = 65;
const FDORG_BASE   = 'https://api.football-data.org/v4';

// Hardcoded fallback (update manually if API is unavailable for a long stretch)
const FALLBACK_NEXT = {
    opponent:    'Chelsea',
    competition: 'Premier League',
    date:        new Date('2026-04-12T15:30:00Z'),  // 4:30 PM WAT = 15:30 UTC
    venue:       'Etihad Stadium',
};
const FALLBACK_LAST = {
    opponent:    'Liverpool',
    cityScore:   4,
    oppScore:    0,
    competition: 'FA Cup QF',
    note:        'Haaland hat-trick 🔵',
    date:        new Date('2026-04-05T11:45:00Z'),
};

let nextMatch   = null;   // populated by fetchCityFixtures()
let countdownFn = null;   // interval reference

function formatWAT(date) {
    // Returns e.g. "Sun Apr 12 · 4:30 PM WAT"
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d     = new Date(date);
    const hh    = d.getHours();
    const mm    = d.getMinutes();
    const ampm  = hh >= 12 ? 'PM' : 'AM';
    const h12   = hh % 12 || 12;
    const min   = mm > 0 ? `:${String(mm).padStart(2,'0')}` : '';
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} · ${h12}${min} ${ampm} WAT`;
}

function applyNextMatch(data) {
    // data: { opponent, competition, date (Date obj), venue }
    nextMatch = data;
    document.getElementById('hero-opponent').innerText = data.opponent;
    document.getElementById('hero-meta').innerText =
        `${data.competition} · ${formatWAT(data.date)} · ${data.venue || 'Etihad Stadium'}`;

    // Update ticker
    const nextTxt = `⚽ NEXT: Man City vs ${data.opponent} (${data.competition}) · ${formatWAT(data.date)}`;
    document.getElementById('ticker-next').innerText  = nextTxt;
    document.getElementById('ticker-next2').innerText = nextTxt;

    startCountdown(data.date);
}

function applyLastResult(data) {
    // data: { opponent, cityScore, oppScore, competition, note, date }
    const won  = data.cityScore > data.oppScore;
    const drew = data.cityScore === data.oppScore;
    document.getElementById('last-result-opp').innerText   = data.opponent;
    document.getElementById('city-score').innerText        = data.cityScore;
    document.getElementById('opp-score').innerText         = data.oppScore;
    document.getElementById('city-score').className        = won ? 'result-win' : (drew ? '' : 'result-loss');
    document.getElementById('opp-score').className         = won ? 'result-loss' : (drew ? '' : 'result-win');
    document.getElementById('last-result-comp').innerText  =
        `${data.competition} · ${data.note || ''}`;

    // Update ticker
    const resultEmoji = won ? '✅' : (drew ? '🤝' : '❌');
    const resultTxt   = `🏆 FT: Man City ${data.cityScore}–${data.oppScore} ${data.opponent} (${data.competition}) ${resultEmoji}`;
    document.getElementById('ticker-match').innerText  = resultTxt;
    document.getElementById('ticker-match2').innerText = resultTxt;
}

async function fetchCityFixtures() {
    const CACHE_KEY = 'jid_city_fixtures';
    const CACHE_TTL = 30 * 60 * 1000;  // 30 minutes

    // Check cache first
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL) {
                applyCityData(data);
                return;
            }
        }
    } catch(e) {}

    try {
        const now    = new Date();
        const past   = new Date(now - 30 * 24 * 60 * 60 * 1000);  // 30 days ago
        const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

        const fmt = d => d.toISOString().split('T')[0];

        // Fetch last finished match
        const lastRes = await fetch(
            `${FDORG_BASE}/teams/${CITY_TEAM_ID}/matches?status=FINISHED&dateFrom=${fmt(past)}&dateTo=${fmt(now)}&limit=5`,
            { headers: { 'X-Auth-Token': '' } }  // free tier — no token needed for basic
        );
        const lastData = await lastRes.json();

        // Fetch next scheduled match
        const nextRes = await fetch(
            `${FDORG_BASE}/teams/${CITY_TEAM_ID}/matches?status=SCHEDULED&dateFrom=${fmt(now)}&dateTo=${fmt(future)}&limit=5`,
            { headers: { 'X-Auth-Token': '' } }
        );
        const nextData = await nextRes.json();

        const processed = processFixtureData(lastData, nextData);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: processed, ts: Date.now() }));
        applyCityData(processed);

    } catch(e) {
        // API failed — use fallbacks silently
        applyCityData(null);
    }
}

function processFixtureData(lastData, nextData) {
    let lastResult = null;
    let nextFixture = null;

    // Process last result
    if (lastData && lastData.matches && lastData.matches.length > 0) {
        const matches = lastData.matches.sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
        const m = matches[0];
        const isHome = m.homeTeam && m.homeTeam.id === CITY_TEAM_ID;
        const opponent = isHome ? (m.awayTeam?.name || 'Unknown') : (m.homeTeam?.name || 'Unknown');
        const cityGoals = isHome ? m.score?.fullTime?.home : m.score?.fullTime?.away;
        const oppGoals  = isHome ? m.score?.fullTime?.away : m.score?.fullTime?.home;
        lastResult = {
            opponent,
            cityScore:   cityGoals ?? 0,
            oppScore:    oppGoals ?? 0,
            competition: m.competition?.name || 'Match',
            note:        '',
            date:        m.utcDate,
        };
    }

    // Process next fixture
    if (nextData && nextData.matches && nextData.matches.length > 0) {
        const matches = nextData.matches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        const m = matches[0];
        const isHome = m.homeTeam && m.homeTeam.id === CITY_TEAM_ID;
        const opponent = isHome ? (m.awayTeam?.name || 'Unknown') : (m.homeTeam?.name || 'Unknown');
        nextFixture = {
            opponent,
            competition: m.competition?.name || 'Match',
            date:        new Date(m.utcDate),
            venue:       isHome ? 'Etihad Stadium' : (m.venue || 'Away'),
        };
    }

    return { lastResult, nextFixture };
}

function applyCityData(data) {
    if (data && data.lastResult) {
        applyLastResult(data.lastResult);
    } else {
        applyLastResult(FALLBACK_LAST);
    }

    if (data && data.nextFixture) {
        applyNextMatch(data.nextFixture);
    } else {
        applyNextMatch(FALLBACK_NEXT);
    }
}

// ─── 6. COUNTDOWN ───
function startCountdown(targetDate) {
    if (countdownFn) clearInterval(countdownFn);

    function tick() {
        const now = new Date().getTime();
        const gap = new Date(targetDate).getTime() - now;

        if (gap <= 0) {
            document.getElementById('countdown').innerText       = "MATCHDAY! 🔵";
            document.getElementById('countdown-secs').innerText  = "Come on City!";
            document.getElementById('countdown-label').innerText = "It's time —";
            return;
        }
        const d = Math.floor(gap / (1000 * 60 * 60 * 24));
        const h = Math.floor((gap % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((gap % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((gap % (1000 * 60)) / 1000);
        document.getElementById('countdown').innerText      = `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
        document.getElementById('countdown-secs').innerText = `${String(s).padStart(2,'0')}s remaining`;
    }

    tick();
    countdownFn = setInterval(tick, 1000);
}

// ─── 7. SAVINGS SIMULATOR ───
function calculateSavings() {
    const P   = parseFloat(document.getElementById('sim-initial').value)  || 0;
    const PMT = parseFloat(document.getElementById('sim-deposit').value)  || 0;
    const r   = parseFloat(document.getElementById('sim-strategy').value) || 0.15;
    const months = parseInt(document.getElementById('sim-months').value)  || 8;

    const n = 12;  // compounded monthly
    const t = months / 12;

    // Future value of principal: A = P(1 + r/n)^(nt)
    const futurePrincipal = P * Math.pow((1 + r / n), (n * t));

    // Future value of monthly deposits: FV = PMT * [((1+r/n)^(nt) - 1) / (r/n)]
    const futureAnnuity = PMT * ((Math.pow((1 + r / n), (n * t)) - 1) / (r / n));

    const totalWealth    = futurePrincipal + futureAnnuity;
    const totalDeposited = P + (PMT * months);
    const interestEarned = totalWealth - totalDeposited;
    const returnPct      = totalDeposited > 0 ? ((interestEarned / totalDeposited) * 100).toFixed(1) : 0;

    // Breakdown percentages for bar
    const pctPrincipal = (P / totalWealth) * 100;
    const pctDeposits  = ((PMT * months) / totalWealth) * 100;
    const pctInterest  = (interestEarned / totalWealth) * 100;

    // Update UI
    document.getElementById('sim-total').innerText =
        `₦${totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('sim-interest-earned').innerText =
        `+ ₦${interestEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('sim-deposited').innerText =
        `₦${totalDeposited.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('sim-return-pct').innerText = `+${returnPct}%`;

    // Animate bar
    setTimeout(() => {
        document.getElementById('sim-bar-principal').style.width = pctPrincipal.toFixed(1) + '%';
        document.getElementById('sim-bar-deposits').style.width  = pctDeposits.toFixed(1)  + '%';
        document.getElementById('sim-bar-interest').style.width  = pctInterest.toFixed(1)  + '%';
    }, 100);
}

// ─── 8. TOOL SWITCHER ───
function showTool(name, btn) {
    document.querySelectorAll('.tool-frame').forEach(f => f.classList.remove('active-frame'));
    document.querySelectorAll('.tool-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + name).classList.add('active-frame');
    btn.classList.add('active');
}

// ─── BOOT ───
updateHeader();
setInterval(updateHeader, 1000);

updateNairaRates();

fetchCityFixtures();
// Refresh fixture data every 30 minutes
setInterval(fetchCityFixtures, 30 * 60 * 1000);

fetchWeather();
fetchCrypto();
setInterval(fetchCrypto, 60000);

calculateSavings();
// Recalculate if inputs change
['sim-deposit', 'sim-initial', 'sim-strategy', 'sim-months'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', calculateSavings);
});
