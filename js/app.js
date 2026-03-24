// Weather widget: geolocation -> Open-Meteo current weather + reverse geocode
(function(){
  const el = document.getElementById('weather-widget');
  if(!el) return;

  const emojiFor = (code) => {
    // Open-Meteo weathercode mapping (simplified)
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
    el.querySelector('.weather-conds').textContent = text;
    el.querySelector('.weather-temp').textContent = '—°';
    el.querySelector('.weather-emoji').textContent = '…';
    el.querySelector('.weather-location').textContent = '';
  }

  const showError = (msg)=>{
    el.querySelector('.weather-conds').textContent = msg;
    el.querySelector('.weather-emoji').textContent = '⚠️';
    el.querySelector('.weather-location').textContent = '';
  }

  const fetchWeather = async (lat, lon) => {
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('Weather fetch failed');
      const data = await r.json();
      if(!data.current_weather) throw new Error('No current weather');
      const w = data.current_weather;
      const emoji = emojiFor(w.weathercode);
      el.querySelector('.weather-emoji').textContent = emoji;
      el.querySelector('.weather-temp').textContent = `${Math.round(w.temperature)}°`;
      el.querySelector('.weather-conds').textContent = `Feels like ${Math.round(w.temperature)}°`;
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
  }

  function locateAndUpdate(){
    setLoading('Detecting…');
    if(!navigator.geolocation){ showError('Geolocation unavailable'); return; }
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      el.querySelector('.weather-location').textContent = `${lat}, ${lon}`;
      await fetchWeather(lat, lon);
      reverseGeocode(lat, lon);
    }, (err)=>{
      console.warn('geo err', err);
      showError('Enable location to see your weather.');
    }, {timeout:10000});
  }

  // init on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', locateAndUpdate);
  else locateAndUpdate();
})();
