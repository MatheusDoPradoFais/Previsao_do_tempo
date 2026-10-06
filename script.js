// WeatherFlow — script.js
// Integração com as APIs gratuitas da Open-Meteo (sem chave, sem backend):
//   - Geocoding API:  https://open-meteo.com/en/docs/geocoding-api
//   - Forecast API:   https://open-meteo.com/en/docs
// Todos os dados exibidos na interface passam a vir dessas APIs.

document.addEventListener('DOMContentLoaded', () => {

  const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const FORECAST_URL  = 'https://api.open-meteo.com/v1/forecast';

  // Elementos da pesquisa
  const searchForm      = document.getElementById('search-form');
  const cityInput       = document.getElementById('city-input');
  const searchButton    = document.getElementById('search-button');
  const headerSearchBtn = document.getElementById('header-search-btn');
  const suggestionsList = document.getElementById('city-suggestions');

  // Estados visuais
  const loadingState = document.getElementById('loading-state');
  const errorState    = document.getElementById('error-state');
  const errorMessage  = document.getElementById('error-message');

  // Cabeçalho / localização
  const placeName = document.getElementById('place-name');

  // Quadro "agora"
  const nowIcon      = document.getElementById('now-icon');
  const nowCondition = document.getElementById('now-condition');
  const nowTemp      = document.getElementById('now-temp');
  const nowMax       = document.getElementById('now-max');
  const nowMin       = document.getElementById('now-min');
  const nowFeels     = document.getElementById('now-feels');

  // Última atualização
  const lastUpdatedTime = document.getElementById('last-updated-time');

  // Próximas horas / próximos dias
  const hoursList = document.getElementById('hours-list');
  const daysList  = document.getElementById('days-list');

  // Estatísticas
  const statHumidity = document.getElementById('stat-humidity');
  const statWind      = document.getElementById('stat-wind');
  const statUv        = document.getElementById('stat-uv');
  const statSunrise   = document.getElementById('stat-sunrise');
  const statSunset    = document.getElementById('stat-sunset');
  const statRain      = document.getElementById('stat-rain');
  const nowQuick      = document.getElementById('now-quick');
  const chartEl       = document.getElementById('temp-chart');
  const geoButton     = document.getElementById('geo-button');
  const themeToggle   = document.getElementById('theme-toggle');
  const unitToggle    = document.getElementById('unit-toggle');

  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let isLoading = false;
  let unit = readPref('wf-unit', 'c');   // 'c' | 'f'
  let lastData = null;                    // última previsão (para trocar °C/°F sem nova requisição)

  // Autocomplete
  const MIN_CHARS = 2;
  const DEBOUNCE_MS = 300;
  let suggestions = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let suggestionsController = null;

  // --------------------------------------------------------------
  // 4. Códigos meteorológicos (WMO) usados pela Open-Meteo
  // --------------------------------------------------------------
  function getWeatherInfo(code) {
    const map = {
      0:  { description: 'Céu limpo',                  emoji: '☀️', icon: 'sun' },
      1:  { description: 'Principalmente ensolarado',   emoji: '🌤️', icon: 'cloud-sun' },
      2:  { description: 'Parcialmente nublado',        emoji: '⛅', icon: 'cloud-sun' },
      3:  { description: 'Nublado',                     emoji: '☁️', icon: 'cloud' },
      45: { description: 'Neblina',                     emoji: '🌫️', icon: 'cloud' },
      48: { description: 'Neblina com geada',           emoji: '🌫️', icon: 'cloud' },
      51: { description: 'Garoa fraca',                 emoji: '🌦️', icon: 'rain' },
      53: { description: 'Garoa moderada',              emoji: '🌦️', icon: 'rain' },
      55: { description: 'Garoa forte',                 emoji: '🌦️', icon: 'rain' },
      56: { description: 'Garoa congelante fraca',      emoji: '🌦️', icon: 'rain' },
      57: { description: 'Garoa congelante forte',      emoji: '🌦️', icon: 'rain' },
      61: { description: 'Chuva fraca',                 emoji: '🌧️', icon: 'rain' },
      63: { description: 'Chuva moderada',              emoji: '🌧️', icon: 'rain' },
      65: { description: 'Chuva forte',                 emoji: '🌧️', icon: 'rain' },
      66: { description: 'Chuva congelante fraca',      emoji: '🌧️', icon: 'rain' },
      67: { description: 'Chuva congelante forte',      emoji: '🌧️', icon: 'rain' },
      71: { description: 'Neve fraca',                  emoji: '❄️', icon: 'cloud' },
      73: { description: 'Neve moderada',               emoji: '❄️', icon: 'cloud' },
      75: { description: 'Neve forte',                  emoji: '❄️', icon: 'cloud' },
      77: { description: 'Grãos de neve',                emoji: '❄️', icon: 'cloud' },
      80: { description: 'Pancadas de chuva fracas',    emoji: '🌧️', icon: 'rain' },
      81: { description: 'Pancadas de chuva moderadas', emoji: '🌧️', icon: 'rain' },
      82: { description: 'Pancadas de chuva fortes',    emoji: '🌧️', icon: 'rain' },
      85: { description: 'Pancadas de neve fracas',     emoji: '❄️', icon: 'cloud' },
      86: { description: 'Pancadas de neve fortes',     emoji: '❄️', icon: 'cloud' },
      95: { description: 'Trovoada',                    emoji: '⛈️', icon: 'storm' },
      96: { description: 'Trovoada com granizo fraco',  emoji: '⛈️', icon: 'storm' },
      99: { description: 'Trovoada com granizo forte',  emoji: '⛈️', icon: 'storm' }
    };
    return map[code] || { description: 'Condição desconhecida', emoji: '❔', icon: 'cloud' };
  }

  // Monta o HTML interno de um glifo (reaproveita as mesmas classes já
  // usadas no design: sun / cloud / cloud-sun / rain / storm)
  function iconInnerHtml(icon) {
    if (icon === 'cloud-sun') return '<i class="peek"></i>';
    if (icon === 'rain')      return '<i></i><i></i><i></i>';
    if (icon === 'storm')     return '<i class="bolt"></i>';
    return '';
  }

  function uvCategory(uv) {
    if (uv >= 11) return 'extremo';
    if (uv >= 8)  return 'muito alto';
    if (uv >= 6)  return 'alto';
    if (uv >= 3)  return 'moderado';
    return 'baixo';
  }

  function formatHour(isoString) {
    return isoString.slice(11, 13) + 'h';
  }

  function formatClock(isoString) {
    return isoString.slice(11, 16);
  }

  // --------------------------------------------------------------
  // Estados visuais
  // --------------------------------------------------------------
  function showLoading() {
    loadingState.hidden = false;
    document.querySelector('.app').classList.add('is-loading');
    searchButton.disabled = true;
    searchButton.setAttribute('aria-busy', 'true');
  }

  function hideLoading() {
    loadingState.hidden = true;
    document.querySelector('.app').classList.remove('is-loading');
    searchButton.disabled = false;
    searchButton.removeAttribute('aria-busy');
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorState.hidden = false;
  }

  function hideError() {
    errorState.hidden = true;
  }

  // --------------------------------------------------------------
  // Preferências (localStorage), unidade e tema
  // --------------------------------------------------------------
  function readPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* armazenamento indisponível */ }
  }
  function savePlace(p) {
    savePref('wf-last-place', JSON.stringify({
      name: p.name, admin1: p.admin1 || '', country: p.country || '',
      latitude: p.latitude, longitude: p.longitude
    }));
  }
  function loadSavedPlace() {
    try {
      const p = JSON.parse(readPref('wf-last-place', 'null'));
      return p && p.name && typeof p.latitude === 'number' && typeof p.longitude === 'number' ? p : null;
    } catch (e) { return null; }
  }

  const toUnit = (c) => (unit === 'f' ? c * 9 / 5 + 32 : c);
  const fmt = (c) => Math.round(toUnit(c)) + '°';
  const pct = (v) => (v == null ? '--' : Math.round(v) + '%');

  function updateUnitButton() {
    unitToggle.innerHTML = unit === 'c' ? '<b>°C</b> | °F' : '°C | <b>°F</b>';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro');
  }

  function apiErrorMessage(status, base) {
    return status === 429 || status >= 500
      ? 'O serviço de previsão está indisponível ou com muitos acessos no momento. Tente novamente em instantes.'
      : base + ' Tente novamente.';
  }

  // --------------------------------------------------------------
  // Renderização
  // --------------------------------------------------------------
  function renderNow(city, current, todayMax, todayMin) {
    placeName.textContent = city;

    const info = getWeatherInfo(current.weather_code);
    nowIcon.setAttribute('aria-label', info.description + ' ' + info.emoji);
    if (info.icon === 'sun') {
      nowIcon.innerHTML = '<div class="sun"></div>';
    } else {
      nowIcon.innerHTML =
        '<span class="now__icon now__icon--' + info.icon + '">' + iconInnerHtml(info.icon) + '</span>';
    }

    nowCondition.textContent = info.description;
    nowTemp.textContent = Math.round(toUnit(current.temperature_2m));
    nowMax.textContent = fmt(todayMax);
    nowMin.textContent = fmt(todayMin);
    nowFeels.textContent = fmt(current.apparent_temperature);
  }

  function renderHours(hourly, startIndex) {
    hoursList.innerHTML = '';
    const count = Math.min(8, hourly.time.length - startIndex);
    const rain = hourly.precipitation_probability || [];

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const info = getWeatherInfo(hourly.weather_code[idx]);
      const label = i === 0 ? 'Agora' : formatHour(hourly.time[idx]);

      const item = document.createElement('div');
      item.className = 'hour' + (i === 0 ? ' hour--now' : '');
      item.innerHTML =
        '<span class="hour__label">' + label + '</span>' +
        '<span class="hour__glyph hour__glyph--' + info.icon + '" role="img" aria-label="' + info.description + '">' + iconInnerHtml(info.icon) + '</span>' +
        '<span class="hour__temp">' + fmt(hourly.temperature_2m[idx]) + '</span>' +
        '<span class="hour__rain" aria-hidden="true"><i style="width:' + (rain[idx] || 0) + '%"></i></span>' +
        '<span class="hour__pct" title="Probabilidade de chuva">' + pct(rain[idx]) + '</span>';
      hoursList.appendChild(item);
    }
  }

  function renderDays(daily) {
    daysList.innerHTML = '';
    const count = Math.min(7, daily.time.length);
    const rain = daily.precipitation_probability_max || [];

    for (let i = 0; i < count; i++) {
      const info = getWeatherInfo(daily.weather_code[i]);
      const min = daily.temperature_2m_min[i];
      const max = daily.temperature_2m_max[i];
      // barra na escala visual do CSS (14° a 32° C)
      const barLo = Math.min(32, Math.max(14, Math.round(min)));
      const barHi = Math.min(32, Math.max(14, Math.round(max)));

      const date = new Date(daily.time[i] + 'T00:00:00');
      const weekday = i === 0 ? 'Hoje' : WEEKDAYS_SHORT[date.getDay()];
      const dm = daily.time[i].slice(8, 10) + '/' + daily.time[i].slice(5, 7);

      const item = document.createElement('li');
      item.className = 'day';
      item.innerHTML =
        '<span class="day__name" title="' + dm + '">' + weekday + '</span>' +
        '<span class="day__glyph day__glyph--' + info.icon + '" aria-hidden="true">' + iconInnerHtml(info.icon) + '</span>' +
        '<span class="day__condition" title="' + info.description + '">' + dm + ' · 💧' + pct(rain[i]) + '</span>' +
        '<span class="day__bar" style="--lo:' + barLo + '; --hi:' + barHi + ';"><span class="day__bar-fill"></span></span>' +
        '<span class="day__min">' + fmt(min) + '</span>' +
        '<span class="day__max">' + fmt(max) + '</span>';
      daysList.appendChild(item);
    }
  }

  function renderStats(current, daily) {
    const uv = daily.uv_index_max && daily.uv_index_max[0] != null ? daily.uv_index_max[0] : null;
    const rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;

    statHumidity.textContent = Math.round(current.relative_humidity_2m) + '%';
    statWind.textContent = Math.round(current.wind_speed_10m) + ' km/h';
    statUv.textContent = uv != null ? Math.round(uv) + ' · ' + uvCategory(uv) : '--';
    statSunrise.textContent = daily.sunrise && daily.sunrise[0] ? formatClock(daily.sunrise[0]) : '--';
    statSunset.textContent = daily.sunset && daily.sunset[0] ? formatClock(daily.sunset[0]) : '--';
    statRain.textContent = pct(rain);

    nowQuick.textContent = 'Umidade ' + statHumidity.textContent + ' · Vento ' + statWind.textContent +
      ' · Chuva ' + statRain.textContent + ' · UV ' + (uv != null ? Math.round(uv) : '--');
  }

  // Gráfico de temperatura em SVG puro (próximas 12 horas)
  function renderChart(hourly, startIndex) {
    const n = Math.min(12, hourly.time.length - startIndex);
    if (n < 2) { chartEl.innerHTML = ''; return; }

    const W = 320, H = 150, padX = 16, padTop = 26, padBottom = 28;
    const vals = [];
    for (let i = 0; i < n; i++) vals.push(toUnit(hourly.temperature_2m[startIndex + i]));
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;

    const pts = vals.map((v, i) => [
      padX + i * (W - 2 * padX) / (n - 1),
      padTop + (max - v) / span * (H - padTop - padBottom)
    ]);

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico da temperatura nas próximas ' + n + ' horas">' +
      '<polyline fill="none" stroke="var(--accent-sun)" stroke-width="2" stroke-linejoin="round" points="' +
      pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '"/>';
    pts.forEach((p, i) => {
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="var(--accent-sun)"/>' +
        '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] - 8).toFixed(1) + '">' + Math.round(vals[i]) + '°</text>' +
        '<text class="chart__hour" x="' + p[0].toFixed(1) + '" y="' + (H - 8) + '">' + formatHour(hourly.time[startIndex + i]) + '</text>';
    });
    chartEl.innerHTML = svg + '</svg>';
  }

  function renderAll(forecast, label) {
    lastData = { forecast, label };
    const { current, hourly, daily } = forecast;
    let start = hourly.time.indexOf(current.time);
    if (start === -1) start = 0;

    renderNow(label, current, daily.temperature_2m_max[0], daily.temperature_2m_min[0]);
    renderHours(hourly, start);
    renderChart(hourly, start);
    renderDays(daily);
    renderStats(current, daily);
  }

  // --------------------------------------------------------------
  // Chamadas às APIs
  // --------------------------------------------------------------
  // Busca até "count" cidades que combinam com o texto digitado.
  // Retorna [] quando a API não encontra nada (ela omite "results" nesse caso).
  async function searchCities(query, count, signal) {
    let response;
    try {
      const url = GEOCODING_URL + '?name=' + encodeURIComponent(query) +
        '&count=' + count + '&language=pt&format=json';
      response = await fetch(url, { signal });
    } catch (networkError) {
      if (networkError.name === 'AbortError') throw networkError;
      throw new Error('Falha de conexão. Verifique sua internet e tente novamente.');
    }

    if (!response.ok) {
      throw new Error(apiErrorMessage(response.status, 'Não foi possível buscar a cidade.'));
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Resposta inesperada do serviço de localização. Tente novamente.');
    }

    return data && Array.isArray(data.results) ? data.results : [];
  }

  async function geocodeCity(city) {
    const results = await searchCities(city, 1);
    if (results.length === 0) {
      throw new Error('Cidade não encontrada. Verifique o nome digitado.');
    }
    return results[0];
  }

  async function fetchForecast(latitude, longitude) {
    let response;
    try {
      const url = FORECAST_URL +
        '?latitude=' + latitude +
        '&longitude=' + longitude +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&hourly=temperature_2m,weather_code,precipitation_probability' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_probability_max' +
        '&forecast_days=7&timezone=auto';
      response = await fetch(url);
    } catch (networkError) {
      throw new Error('Falha de conexão. Verifique sua internet e tente novamente.');
    }

    if (!response.ok) {
      throw new Error(apiErrorMessage(response.status, 'Não foi possível obter a previsão.'));
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Resposta inesperada do serviço de clima. Tente novamente.');
    }

    if (!data || !data.current || !data.hourly || !data.daily) {
      throw new Error('Resposta inesperada do serviço de clima. Tente novamente.');
    }

    return data;
  }

  // --------------------------------------------------------------
  // Fluxo principal da pesquisa
  // --------------------------------------------------------------
  async function searchWeather(rawCity, chosenPlace) {
    const city = (rawCity || '').trim();

    if (isLoading) return;

    if (!city && !chosenPlace) {
      showError('Digite uma cidade para pesquisar.');
      return;
    }

    isLoading = true;
    hideError();
    showLoading();

    try {
      const place = chosenPlace || await geocodeCity(city);
      const forecast = await fetchForecast(place.latitude, place.longitude);

      const cityLabel = placeLabel(place);

      renderAll(forecast, cityLabel);
      if (!place.fromGeo) savePlace(place);

      lastUpdatedTime.textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      hideError();
    } catch (error) {
      showError(error.message || 'Não foi possível obter os dados meteorológicos.');
    } finally {
      hideLoading();
      isLoading = false;
    }
  }

  // --------------------------------------------------------------
  // Autocomplete de cidades
  // --------------------------------------------------------------
  function placeLabel(place) {
    return place.admin1 ? place.name + ', ' + place.admin1 : place.name;
  }

  function placeMeta(place) {
    const parts = [];
    if (place.admin1) parts.push(place.admin1);
    if (place.country) parts.push(place.country);
    return parts.join(' · ');
  }

  function closeSuggestions() {
    suggestions = [];
    activeIndex = -1;
    suggestionsList.innerHTML = '';
    suggestionsList.hidden = true;
    cityInput.setAttribute('aria-expanded', 'false');
    cityInput.removeAttribute('aria-activedescendant');
  }

  function setActive(index) {
    activeIndex = index;
    const items = suggestionsList.querySelectorAll('.suggestions__item');
    items.forEach((el, i) => {
      el.setAttribute('aria-selected', i === index ? 'true' : 'false');
      if (i === index) {
        cityInput.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    });
    if (index < 0) cityInput.removeAttribute('aria-activedescendant');
  }

  function renderSuggestions(results) {
    suggestions = results;
    activeIndex = -1;
    suggestionsList.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'suggestions__empty';
      empty.textContent = 'Nenhuma cidade encontrada.';
      suggestionsList.appendChild(empty);
    } else {
      results.forEach((place, i) => {
        const li = document.createElement('li');
        li.className = 'suggestions__item';
        li.id = 'suggestion-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');

        const name = document.createElement('span');
        name.className = 'suggestions__name';
        name.textContent = place.name;

        const meta = document.createElement('span');
        meta.className = 'suggestions__meta';
        meta.textContent = placeMeta(place);

        li.appendChild(name);
        li.appendChild(meta);

        // mousedown (e não click) para disparar antes do blur do input
        li.addEventListener('mousedown', (event) => {
          event.preventDefault();
          selectPlace(place);
        });
        suggestionsList.appendChild(li);
      });
    }

    suggestionsList.hidden = false;
    cityInput.setAttribute('aria-expanded', 'true');
  }

  function selectPlace(place) {
    cityInput.value = placeLabel(place);
    closeSuggestions();
    searchWeather(place.name, place);
  }

  async function updateSuggestions() {
    const query = cityInput.value.trim();

    if (query.length < MIN_CHARS) {
      closeSuggestions();
      return;
    }

    // cancela a requisição anterior para evitar resposta fora de ordem
    if (suggestionsController) suggestionsController.abort();
    suggestionsController = new AbortController();
    const { signal } = suggestionsController;

    try {
      const results = await searchCities(query, 6, signal);
      if (signal.aborted) return;
      renderSuggestions(results);
    } catch (error) {
      if (error.name === 'AbortError') return;
      closeSuggestions();
    }
  }

  cityInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateSuggestions, DEBOUNCE_MS);
  });

  cityInput.addEventListener('keydown', (event) => {
    if (suggestionsList.hidden || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectPlace(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      closeSuggestions();
    }
  });

  cityInput.addEventListener('blur', () => {
    clearTimeout(debounceTimer);
    setTimeout(closeSuggestions, 120);
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(debounceTimer);
    if (suggestionsController) suggestionsController.abort();
    closeSuggestions();
    searchWeather(cityInput.value);
  });

  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', () => {
      cityInput.focus();
    });
  }

  // --------------------------------------------------------------
  // Minha localização
  // --------------------------------------------------------------
  // A Open-Meteo não faz geocodificação reversa; usamos o serviço gratuito
  // BigDataCloud só para descobrir o nome da cidade. Se falhar, o clima segue normal.
  async function reverseGeocode(lat, lon) {
    try {
      const r = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
        lat + '&longitude=' + lon + '&localityLanguage=pt');
      if (!r.ok) return null;
      const d = await r.json();
      const name = d.city || d.locality;
      return name ? { name, admin1: d.principalSubdivision || '', country: d.countryName || '' } : null;
    } catch (e) { return null; }
  }

  function useMyLocation() {
    if (isLoading) return;
    if (!('geolocation' in navigator)) {
      showError('Seu navegador não oferece localização. Pesquise a cidade pelo nome.');
      return;
    }
    hideError();
    geoButton.disabled = true;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const found = await reverseGeocode(latitude, longitude);
      const place = Object.assign({ name: 'Minha localização' }, found, { latitude, longitude, fromGeo: true });
      geoButton.disabled = false;
      cityInput.value = found ? placeLabel(place) : '';
      searchWeather(place.name, place);
    }, (err) => {
      geoButton.disabled = false;
      const msgs = {
        1: 'Permissão de localização negada. Libere o acesso no navegador ou pesquise a cidade pelo nome.',
        2: 'Não foi possível descobrir sua localização agora. Tente novamente ou pesquise a cidade.',
        3: 'A localização demorou demais para responder. Tente novamente.'
      };
      showError(msgs[err.code] || 'Não foi possível obter sua localização.');
    }, { timeout: 10000, maximumAge: 300000 });
  }

  geoButton.addEventListener('click', useMyLocation);

  unitToggle.addEventListener('click', () => {
    unit = unit === 'c' ? 'f' : 'c';
    savePref('wf-unit', unit);
    updateUnitButton();
    if (lastData) renderAll(lastData.forecast, lastData.label);
  });

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    savePref('wf-theme', next);
    applyTheme(next);
  });

  // Inicialização: tema, unidade e última cidade (ou Valinhos como padrão)
  applyTheme(readPref('wf-theme', 'dark'));
  updateUnitButton();
  const saved = loadSavedPlace();
  if (saved) searchWeather(saved.name, saved); else searchWeather('Valinhos');

});
