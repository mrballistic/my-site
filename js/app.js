// Weather widget: geolocation -> Open-Meteo current weather + reverse geocode
(function(){
  const el = document.getElementById('weather-widget');
  if(!el) return;

  const emojiFor = (code) => {
    if(code === 0) return '☀️';
    if(code === 1 || code === 2) return '⛅';
    if(code === 3) return '☁️';
    if([45,48].includes(code)) return '🌫️';
    if((code>=51 && code<=67) || (code>=80 && code<=82)) return '🌧️';
    if(code>=71 && code<=77) return '❄️';
    if(code>=95) return '⛈️';
    return '❓';
  };

  const setLoading = (text)=>{
    const cond = el.querySelector('.weather-conds');
    const temp = el.querySelector('.weather-temp');
    const emoji = el.querySelector('.weather-emoji');
    const loc = el.querySelector('.weather-location');
    if(cond) cond.textContent = text;
    if(temp) temp.textContent = '—°';
    if(emoji) emoji.textContent = '…';
    if(loc) loc.textContent = '';
  };

  const showError = (msg)=>{
    const cond = el.querySelector('.weather-conds');
    const emoji = el.querySelector('.weather-emoji');
    const loc = el.querySelector('.weather-location');
    if(cond) cond.textContent = msg;
    if(emoji) emoji.textContent = '⚠️';
    if(loc) loc.textContent = '';
  };

  const fetchWeather = async (lat, lon) => {
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('Weather fetch failed');
      const data = await r.json();
      if(!data.current_weather) throw new Error('No current weather');
      const w = data.current_weather;
      const emoji = emojiFor(w.weathercode);
      const emojiEl = el.querySelector('.weather-emoji');
      const tempEl = el.querySelector('.weather-temp');
      const condEl = el.querySelector('.weather-conds');
      if(emojiEl) emojiEl.textContent = emoji;
      if(tempEl) tempEl.textContent = `${Math.round(w.temperature)}°`;
      if(condEl) condEl.textContent = `Feels like ${Math.round(w.temperature)}°`;
    }catch(err){
      showError('Unable to load weather');
      console.error(err);
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try{
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&limit=1`);
      if(!r.ok) return;
      const j = await r.json();
      const name = (j && j.results && j.results[0] && (j.results[0].name || j.results[0].locality || j.results[0].county)) || '';
      if(name) el.querySelector('.weather-location').textContent = name;
    }catch(e){ console.warn('reverse geocode', e); }
  };

  // Promise wrapper around getCurrentPosition so we can fallback on timeout/denial
  function getPosition(options = {timeout: 20000}){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject({code: 0, message: 'Geolocation not supported'});
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  // Fallback using IP-based geo (best-effort). Uses ipapi.co which returns JSON with latitude/longitude.
  async function fallbackIP(){
    try{
      const r = await fetch('https://ipapi.co/json/');
      if(!r.ok) throw new Error('IP geolocation failed');
      const j = await r.json();
      if(j && j.latitude && j.longitude) return {coords: {latitude: j.latitude, longitude: j.longitude}};
    }catch(e){ console.warn('ip fallback failed', e); }
    return null;
  }

  async function locateAndUpdate(){
    setLoading('Detecting…');
    try{
      const pos = await getPosition({timeout: 20000});
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      const locEl = el.querySelector('.weather-location');
      if(locEl) locEl.textContent = `${lat}, ${lon}`;
      await fetchWeather(lat, lon);
      reverseGeocode(lat, lon);
    }catch(err){
      console.warn('geo err', err);
      // If timeout or permission denied, try IP fallback
      if(err && (err.code === 3 || err.code === 1 || err.code === 0)){
        const ipPos = await fallbackIP();
        if(ipPos){
          const lat = Number(ipPos.coords.latitude).toFixed(4);
          const lon = Number(ipPos.coords.longitude).toFixed(4);
          const locEl = el.querySelector('.weather-location');
          if(locEl) locEl.textContent = `${lat}, ${lon}`;
          await fetchWeather(lat, lon);
          // reverse geocode might still work but skip to avoid extra failures
          return;
        }
      }
      if(err && err.code === 1) showError('Location access denied. Showing limited data.');
      else if(err && err.code === 3) showError('Location timed out. Showing limited data.');
      else showError('Unable to detect location');
    }
  }

  // init on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', locateAndUpdate);
  else locateAndUpdate();
})();
