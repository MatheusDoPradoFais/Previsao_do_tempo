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

  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let isLoading = false;

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
    nowTemp.textContent = Math.round(current.temperature_2m);
    nowMax.textContent = Math.round(todayMax) + '°';
    nowMin.textContent = Math.round(todayMin) + '°';
    nowFeels.textContent = Math.round(current.apparent_temperature) + '°';
  }

  function renderHours(hourly, startIndex) {
    hoursList.innerHTML = '';
    const count = Math.min(8, hourly.time.length - startIndex);

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const info = getWeatherInfo(hourly.weather_code[idx]);
      const label = i === 0 ? 'Agora' : formatHour(hourly.time[idx]);

      const item = document.createElement('div');
      item.className = 'hour' + (i === 0 ? ' hour--now' : '');
      item.innerHTML =
        '<span class="hour__label">' + label + '</span>' +
        '<span class="hour__glyph hour__glyph--' + info.icon + '" aria-hidden="true">' + iconInnerHtml(info.icon) + '</span>' +
        '<span class="hour__temp">' + Math.round(hourly.temperature_2m[idx]) + '°</span>';
      hoursList.appendChild(item);
    }
  }

  function renderDays(daily) {
    daysList.innerHTML = '';
    const count = Math.min(7, daily.time.length);

    for (let i = 0; i < count; i++) {
      const info = getWeatherInfo(daily.weather_code[i]);
      const min = Math.round(daily.temperature_2m_min[i]);
      const max = Math.round(daily.temperature_2m_max[i]);
      // mantém a barra dentro da escala visual já definida no CSS (14° a 32°)
      const barLo = Math.min(32, Math.max(14, min));
      const barHi = Math.min(32, Math.max(14, max));

      const weekday = i === 0 ? 'Hoje' : WEEKDAYS_SHORT[new Date(daily.time[i] + 'T00:00:00').getDay()];

      const item = document.createElement('li');
      item.className = 'day';
      item.innerHTML =
        '<span class="day__name">' + weekday + '</span>' +
        '<span class="day__glyph day__glyph--' + info.icon + '" aria-hidden="true">' + iconInnerHtml(info.icon) + '</span>' +
        '<span class="day__condition">' + info.description + '</span>' +
        '<span class="day__bar" style="--lo:' + barLo + '; --hi:' + barHi + ';"><span class="day__bar-fill"></span></span>' +
        '<span class="day__min">' + min + '°</span>' +
        '<span class="day__max">' + max + '°</span>';
      daysList.appendChild(item);
    }
  }

  function renderStats(current, daily) {
    statHumidity.textContent = Math.round(current.relative_humidity_2m) + '%';
    statWind.textContent = Math.round(current.wind_speed_10m) + ' km/h';

    const uv = daily.uv_index_max && daily.uv_index_max[0] != null ? daily.uv_index_max[0] : null;
    statUv.textContent = uv != null ? Math.round(uv) + ' · ' + uvCategory(uv) : '--';

    statSunrise.textContent = daily.sunrise && daily.sunrise[0] ? formatClock(daily.sunrise[0]) : '--';
  }

  // --------------------------------------------------------------
  // Chamadas às APIs
  // --------------------------------------------------------------
  async function geocodeCity(city) {
    let response;
    try {
      const url = GEOCODING_URL + '?name=' + encodeURIComponent(city) + '&count=1&language=pt&format=json';
      response = await fetch(url);
    } catch (networkError) {
      throw new Error('Falha de conexão. Verifique sua internet e tente novamente.');
    }

    if (!response.ok) {
      throw new Error('Não foi possível buscar a cidade. Tente novamente mais tarde.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Resposta inesperada do serviço de localização. Tente novamente.');
    }

    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Cidade não encontrada. Verifique o nome digitado.');
    }

    return data.results[0];
  }

  async function fetchForecast(latitude, longitude) {
    let response;
    try {
      const url = FORECAST_URL +
        '?latitude=' + latitude +
        '&longitude=' + longitude +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&hourly=temperature_2m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset' +
        '&forecast_days=7&timezone=auto';
      response = await fetch(url);
    } catch (networkError) {
      throw new Error('Falha de conexão. Verifique sua internet e tente novamente.');
    }

    if (!response.ok) {
      throw new Error('Não foi possível obter os dados meteorológicos.');
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
  async function searchWeather(rawCity) {
    const city = rawCity.trim();

    if (isLoading) return;

    if (!city) {
      showError('Digite uma cidade para pesquisar.');
      return;
    }

    isLoading = true;
    hideError();
    showLoading();

    try {
      const place = await geocodeCity(city);
      const forecast = await fetchForecast(place.latitude, place.longitude);

      const cityLabel = place.admin1 ? place.name + ', ' + place.admin1 : place.name;

      // índice da hora atual dentro do array "hourly"
      let startIndex = forecast.hourly.time.indexOf(forecast.current.time);
      if (startIndex === -1) startIndex = 0;

      renderNow(
        cityLabel,
        forecast.current,
        forecast.daily.temperature_2m_max[0],
        forecast.daily.temperature_2m_min[0]
      );
      renderHours(forecast.hourly, startIndex);
      renderDays(forecast.daily);
      renderStats(forecast.current, forecast.daily);

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

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchWeather(cityInput.value);
  });

  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', () => {
      cityInput.focus();
    });
  }

});
