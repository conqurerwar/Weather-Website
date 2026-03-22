// ─────────────────────────────────────────────────────────
// CONFIG — replace with your free key from openweathermap.org
// ─────────────────────────────────────────────────────────
const API_KEY  = '1bb0b28812c37efa6c0f2fb62ee4ec4f';
const BASE     = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE = 'https://api.openweathermap.org/geo/1.0';

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────
let unit       = 'C';
let lastData   = null;
let searchTimer = null;

// ─────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────
const cityInput      = document.getElementById('cityInput');
const searchBtn      = document.getElementById('searchBtn');
const suggestions    = document.getElementById('suggestions');
const errorBanner    = document.getElementById('errorBanner');
const loaderWrap     = document.getElementById('loaderWrap');
const weatherBody    = document.getElementById('weatherBody');

// ─────────────────────────────────────────────────────────
// UNIT TOGGLE
// ─────────────────────────────────────────────────────────
function setUnit(u) {
  unit = u;
  document.getElementById('btnC').classList.toggle('active', u === 'C');
  document.getElementById('btnF').classList.toggle('active', u === 'F');
  if (lastData) renderWeather(lastData.current, lastData.forecast);
}

function toDisplay(c) {
  return unit === 'C' ? `${Math.round(c)}°C` : `${Math.round(c * 9/5 + 32)}°F`;
}

// ─────────────────────────────────────────────────────────
// SHOW / HIDE STATES
// ─────────────────────────────────────────────────────────
function showLoader() {
  loaderWrap.style.display = 'flex';
  weatherBody.style.display = 'none';
  hideError();
}
function showWeather() {
  loaderWrap.style.display = 'none';
  weatherBody.style.display = 'flex';
}
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.add('show');
  loaderWrap.style.display = 'none';
}
function hideError() {
  errorBanner.classList.remove('show');
}

// ─────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────
async function fetchWeather(city) {
  if (!city.trim()) { showError('Please enter a city name.'); return; }
  showLoader();
  suggestions.innerHTML = '';

  try {
    const [curRes, fcRes] = await Promise.all([
      fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
      fetch(`${BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
    ]);

    if (!curRes.ok) {
      if (curRes.status === 404) throw new Error('City not found. Try another name.');
      if (curRes.status === 401) throw new Error('Invalid API key. Check your key in script.js.');
      throw new Error('Something went wrong. Please try again.');
    }

    const current  = await curRes.json();
    const forecast = await fcRes.json();

    lastData = { current, forecast };
    renderWeather(current, forecast);
    fetchAQI(current.coord.lat, current.coord.lon);
    showWeather();
    animateBackground(current.weather[0].main);

  } catch (err) {
    showError(err.message);
  }
}

// ─────────────────────────────────────────────────────────
// AQI
// ─────────────────────────────────────────────────────────
async function fetchAQI(lat, lon) {
  try {
    const res  = await fetch(`${BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const data = await res.json();
    const aqi  = data.list[0].main.aqi; // 1-5
    const aqiSection = document.getElementById('aqiSection');
    aqiSection.style.display = 'block';
    const pct = ((aqi - 1) / 4) * 100;
    document.getElementById('aqiFill').style.width = pct + '%';
    document.getElementById('aqiNeedle').style.left = pct + '%';
    const labels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const colors = ['#66bb6a', '#ffee58', '#ffa726', '#ef5350', '#b71c1c'];
    document.getElementById('aqiDesc').textContent =
      `Air quality is ${labels[aqi-1]} in this area.`;
    document.getElementById('aqiDesc').style.color = colors[aqi-1];
  } catch {}
}

// ─────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────
function renderWeather(data, forecast) {
  // ── Hero ──
  document.getElementById('cityLabel').textContent =
    `${data.name}, ${data.sys.country}`;
  document.getElementById('dateLabel').textContent = formatDateTime(data.timezone);
  document.getElementById('bigTemp').textContent   = toDisplay(data.main.temp);
  document.getElementById('tempHi').textContent    = '↑ ' + toDisplay(data.main.temp_max);
  document.getElementById('tempLo').textContent    = '↓ ' + toDisplay(data.main.temp_min);
  document.getElementById('condLabel').textContent = data.weather[0].description;
  document.getElementById('feelsLike').textContent = toDisplay(data.main.feels_like);
  document.getElementById('heroIcon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  // ── Stats ──
  document.getElementById('humidity').textContent  = `${data.main.humidity}%`;
  document.getElementById('humBar').style.width    = data.main.humidity + '%';
  document.getElementById('clouds').textContent    = `${data.clouds.all}%`;
  document.getElementById('cloudBar').style.width  = data.clouds.all + '%';

  const windKmh = Math.round(data.wind.speed * 3.6);
  document.getElementById('wind').textContent      = `${windKmh} km/h`;
  document.getElementById('pressure').textContent  = `${data.main.pressure} hPa`;
  document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;

  // UV placeholder (free tier doesn't include UV in basic endpoint)
  document.getElementById('uvIndex').textContent = '--';

  // Wind direction arrow
  if (data.wind.deg !== undefined) {
    document.getElementById('windArrow').style.transform = `rotate(${data.wind.deg}deg)`;
  }

  // ── Sun Arc ──
  const tz  = data.timezone;
  const sr  = formatTime(data.sys.sunrise, tz);
  const ss  = formatTime(data.sys.sunset,  tz);
  document.getElementById('sunrise').textContent = sr;
  document.getElementById('sunset').textContent  = ss;

  const now     = Math.floor(Date.now() / 1000);
  const total   = data.sys.sunset - data.sys.sunrise;
  const elapsed = Math.max(0, Math.min(now - data.sys.sunrise, total));
  const pct     = total > 0 ? (elapsed / total) * 90 + 5 : 5;
  document.getElementById('sunDot').style.left = pct + '%';

  const dayMins = Math.round(total / 60);
  document.getElementById('dayLength').textContent =
    `Day length: ${Math.floor(dayMins/60)}h ${dayMins % 60}m`;

  // ── 5-Day Forecast ──
  const daily = getDailyForecast(forecast.list);
  const row   = document.getElementById('forecastRow');
  row.innerHTML = '';
  daily.slice(0, 5).forEach(day => {
    const icon = weatherCodeToEmoji(day.weather[0].main);
    const card = document.createElement('div');
    card.className = 'fc-card';
    card.innerHTML = `
      <div class="fc-day">${day.dayName}</div>
      <div class="fc-icon">${icon}</div>
      <div class="fc-hi">${toDisplay(day.temp_max)}</div>
      <div class="fc-lo">${toDisplay(day.temp_min)}</div>
      <div class="fc-rain">💧 ${Math.round(day.pop * 100)}%</div>
    `;
    row.appendChild(card);
  });

  // ── Map ──
  const mapFrame = document.getElementById('mapFrame');
  const { lat, lon } = data.coord;
  mapFrame.innerHTML = `<iframe
    src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.5},${lat-0.5},${lon+0.5},${lat+0.5}&layer=mapnik&marker=${lat},${lon}"
    style="width:100%;height:100%;border:none;">
  </iframe>`;
}

// ─────────────────────────────────────────────────────────
// BACKGROUND ANIMATION BY CONDITION
// ─────────────────────────────────────────────────────────
function animateBackground(condition) {
  const orb1 = document.querySelector('.orb1');
  const orb2 = document.querySelector('.orb2');
  const orb3 = document.querySelector('.orb3');
  const themes = {
    Clear:        { o1: '#1565c0', o2: '#f9a825', o3: '#0288d1' },
    Clouds:       { o1: '#37474f', o2: '#546e7a', o3: '#607d8b' },
    Rain:         { o1: '#1a237e', o2: '#006064', o3: '#263238' },
    Drizzle:      { o1: '#1a237e', o2: '#006064', o3: '#263238' },
    Thunderstorm: { o1: '#311b92', o2: '#1a237e', o3: '#37474f' },
    Snow:         { o1: '#e3f2fd', o2: '#90caf9', o3: '#bbdefb' },
    Mist:         { o1: '#546e7a', o2: '#607d8b', o3: '#78909c' },
    Fog:          { o1: '#546e7a', o2: '#607d8b', o3: '#78909c' },
  };
  const t = themes[condition] || themes.Clear;
  orb1.style.background = t.o1;
  orb2.style.background = t.o2;
  orb3.style.background = t.o3;
}

// ─────────────────────────────────────────────────────────
// AUTOCOMPLETE SUGGESTIONS
// ─────────────────────────────────────────────────────────
async function fetchSuggestions(q) {
  if (q.length < 2) { suggestions.innerHTML = ''; return; }
  try {
    const res  = await fetch(`${GEO_BASE}/direct?q=${encodeURIComponent(q)}&limit=5&appid=${API_KEY}`);
    const list = await res.json();
    suggestions.innerHTML = '';
    list.forEach(item => {
      const d  = document.createElement('div');
      d.className = 'suggestion-item';
      d.textContent = `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`;
      d.addEventListener('click', () => {
        cityInput.value = item.name;
        suggestions.innerHTML = '';
        fetchWeather(item.name);
      });
      suggestions.appendChild(d);
    });
  } catch {}
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function formatTime(unix, tz) {
  const d   = new Date((unix + tz) * 1000);
  let h     = d.getUTCHours(), m = d.getUTCMinutes();
  const ap  = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2,'0')} ${ap}`;
}

function formatDateTime(tz) {
  const now  = new Date();
  const utc  = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + tz * 1000);
  return local.toLocaleString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function getDailyForecast(list) {
  const days = {};
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  list.forEach(item => {
    const d    = new Date(item.dt * 1000);
    const key  = d.toDateString();
    if (!days[key]) {
      days[key] = {
        dayName: dayNames[d.getDay()],
        temp_max: item.main.temp_max,
        temp_min: item.main.temp_min,
        weather: item.weather,
        pop: item.pop
      };
    } else {
      days[key].temp_max = Math.max(days[key].temp_max, item.main.temp_max);
      days[key].temp_min = Math.min(days[key].temp_min, item.main.temp_min);
      if (item.pop > days[key].pop) {
        days[key].pop     = item.pop;
        days[key].weather = item.weather;
      }
    }
  });
  return Object.values(days);
}

function weatherCodeToEmoji(main) {
  const map = {
    Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️',
    Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Fog:'🌫️',
    Haze:'🌫️', Dust:'💨', Sand:'💨', Ash:'🌋', Squall:'💨', Tornado:'🌪️'
  };
  return map[main] || '🌤️';
}

// ─────────────────────────────────────────────────────────
// PARTICLE SYSTEM
// ─────────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * 1000, y: Math.random() * 1000,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.4 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129,212,250,${p.o})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => fetchWeather(cityInput.value));

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { suggestions.innerHTML = ''; fetchWeather(cityInput.value); }
});

cityInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchSuggestions(cityInput.value), 300);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) suggestions.innerHTML = '';
});

function quickCity(name) {
  cityInput.value = name;
  fetchWeather(name);
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
fetchWeather('London');