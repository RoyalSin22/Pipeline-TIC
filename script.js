
(function(){
  "use strict";
  const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

  const video = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  const empty = document.getElementById('empty');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const snapBtn = document.getElementById('snapBtn');
  const statusTxt = document.getElementById('statusTxt');
  const liveDot = document.getElementById('liveDot');
  const loader = document.getElementById('loader');

  const moodEmoji = document.getElementById('moodEmoji');
  const moodName = document.getElementById('moodName');
  const moodMsg = document.getElementById('moodMsg');
  const moodConf = document.getElementById('moodConf');
  const barsEl = document.getElementById('bars');
  const suggestEl = document.getElementById('suggest');
  const ageVal = document.getElementById('ageVal');
  const genderVal = document.getElementById('genderVal');
  const facesVal = document.getElementById('facesVal');

  let stream=null, running=false, rafTimer=null, modelsLoaded=false;
  let ageSmooth=null;

  // Config por emoción: emoji, color de tema, mensaje empático y sugerencia
  const MOODS = {
    happy:    { es:'feliz',       emoji:'😄', c1:'#ffd166', c2:'#ff8a5c',
                msg:['¡Se te ve genial! Que siga la buena energía.','Tu sonrisa lo dice todo. 🎉','Momento perfecto para compartir tu ánimo.'],
                sug:'Aprovecha el impulso: <a href="https://www.youtube.com/results?search_query=happy+upbeat+playlist" target="_blank" rel="noopener">música alegre</a> o comparte algo bueno con alguien.' },
    sad:      { es:'triste',      emoji:'😢', c1:'#5c8bff', c2:'#7c5cff',
                msg:['Está bien no estar al 100%. Respira hondo.','Un pequeño descanso puede ayudar. 💙','Sé amable contigo mismo hoy.'],
                sug:'Prueba algo reconfortante: <a href="https://www.youtube.com/results?search_query=calm+relaxing+music" target="_blank" rel="noopener">música tranquila</a>, un té caliente o hablar con alguien de confianza.' },
    angry:    { es:'enojado',     emoji:'😠', c1:'#ff5b5b', c2:'#ff8a5c',
                msg:['Detecto tensión. Inhala 4s, exhala 6s.','Una pausa breve puede bajar la intensidad.','Tu calma es tu poder. 🧘'],
                sug:'Baja revoluciones: <a href="https://www.youtube.com/results?search_query=breathing+exercise+5+minutes" target="_blank" rel="noopener">ejercicio de respiración</a> o camina un par de minutos.' },
    fearful:  { es:'con miedo',   emoji:'😨', c1:'#9b7cff', c2:'#4cc2ff',
                msg:['Estás a salvo. Enfócate en el presente.','Nombra 3 cosas que ves a tu alrededor.','Todo pasa. Vas bien. 🌱'],
                sug:'Técnica de anclaje 5-4-3-2-1 o <a href="https://www.youtube.com/results?search_query=grounding+meditation" target="_blank" rel="noopener">meditación de anclaje</a>.' },
    disgusted:{ es:'con disgusto',emoji:'🤢', c1:'#43e08a', c2:'#4cc2ff',
                msg:['Algo no te cuadra. Escucha esa señal.','Cambiemos el foco a algo agradable.','Un cambio de aire puede venir bien.'],
                sug:'Cambia de ambiente o de actividad unos minutos para reiniciar.' },
    surprised:{ es:'sorprendido', emoji:'😲', c1:'#4cc2ff', c2:'#7c5cff',
                msg:['¡Vaya! Algo te llamó la atención.','Cara de asombro detectada. 👀','La curiosidad es buena señal.'],
                sug:'Canaliza la curiosidad: <a href="https://www.youtube.com/results?search_query=amazing+facts" target="_blank" rel="noopener">descubre algo nuevo</a>.' },
    neutral:  { es:'neutral',     emoji:'😐', c1:'#4cc2ff', c2:'#7c5cff',
                msg:['Estado equilibrado. Buen punto de partida.','Tranquilo y centrado. 🙂','Todo en orden por aquí.'],
                sug:'Buen momento para concentrarte: <a href="https://www.youtube.com/results?search_query=focus+lofi+playlist" target="_blank" rel="noopener">música para concentración</a>.' }
  };
  const ORDER = ['happy','sad','angry','fearful','disgusted','surprised','neutral'];
  let lastMood=null, msgIdx=0;

  function setStatus(t, live){ statusTxt.textContent=t; liveDot.classList.toggle('live',!!live); }

  function buildBars(){
    barsEl.innerHTML='';
    for(const k of ORDER){
      const m = MOODS[k];
      const row=document.createElement('div'); row.className='bar-row';
      row.innerHTML='<div class="lbl">'+m.es+'</div>'+
        '<div class="bar-track"><div class="bar-fill" id="fill-'+k+'" style="background:linear-gradient(90deg,'+m.c1+','+m.c2+')"></div></div>'+
        '<div class="val" id="val-'+k+'">0%</div>';
      barsEl.appendChild(row);
    }
  }

  async function loadModels(){
    if(modelsLoaded) return;
    setStatus('Cargando modelos…'); loader.textContent='Descargando modelos de IA (primera vez)…';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    modelsLoaded=true; loader.textContent='';
  }

  async function start(){
    try{
      startBtn.disabled=true;
      await loadModels();
      setStatus('Solicitando cámara…');
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
      video.srcObject=stream; await video.play();
      empty.style.display='none';
      running=true; stopBtn.disabled=false; snapBtn.disabled=false;
      setStatus('Analizando en vivo', true);
      resizeOverlay();
      loop();
    }catch(err){
      setStatus('Error: '+(err.message||err.name));
      loader.textContent='No se pudo iniciar: '+(err.message||err.name);
      startBtn.disabled=false;
    }
  }

  function stop(){
    running=false; if(rafTimer) clearTimeout(rafTimer);
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    video.srcObject=null; empty.style.display='flex';
    stopBtn.disabled=true; snapBtn.disabled=true; startBtn.disabled=false;
    setStatus('Detenido');
    overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
  }

  function resizeOverlay(){
    overlay.width = video.videoWidth || overlay.clientWidth;
    overlay.height = video.videoHeight || overlay.clientHeight;
  }

  const opts = new faceapi.TinyFaceDetectorOptions({inputSize:224, scoreThreshold:0.4});

  async function loop(){
    if(!running) return;
    if(video.readyState>=2){
      if(overlay.width!==video.videoWidth) resizeOverlay();
      const results = await faceapi.detectAllFaces(video, opts).withFaceExpressions().withAgeAndGender();
      draw(results);
      if(results.length){ updatePanel(results[0]); facesVal.textContent=results.length; }
      else { facesVal.textContent=0; }
    }
    rafTimer = setTimeout(()=>requestAnimationFrame(loop), 120); // ~8 fps, suficiente y ligero
  }

  function draw(results){
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0,0,overlay.width,overlay.height);
    ctx.lineWidth=3; ctx.font='16px sans-serif';
    for(const r of results){
      const b=r.detection.box;
      const top = topExpr(r.expressions);
      const col = MOODS[top.key] ? MOODS[top.key].c1 : '#4cc2ff';
      ctx.strokeStyle=col; ctx.strokeRect(b.x,b.y,b.width,b.height);
      // etiqueta (el canvas está espejado, así que dibujamos el texto sin espejo)
      ctx.save(); ctx.scale(-1,1);
      const label = (MOODS[top.key]?MOODS[top.key].emoji+' '+MOODS[top.key].es:top.key);
      const tx = -(b.x+b.width);
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(tx, b.y-24, b.width, 22);
      ctx.fillStyle=col; ctx.fillText(label, tx+6, b.y-8);
      ctx.restore();
    }
  }

  function topExpr(expr){
    let key='neutral', v=-1;
    for(const k in expr){ if(expr[k]>v){ v=expr[k]; key=k; } }
    return {key, v};
  }

  function updatePanel(r){
    const expr = r.expressions;
    // barras
    for(const k of ORDER){
      const pct = Math.round((expr[k]||0)*100);
      const f=document.getElementById('fill-'+k), val=document.getElementById('val-'+k);
      if(f) f.style.width=pct+'%'; if(val) val.textContent=pct+'%';
    }
    const top = topExpr(expr);
    const mood = MOODS[top.key] || MOODS.neutral;

    // tema visual
    document.documentElement.style.setProperty('--mood', mood.c1);
    document.documentElement.style.setProperty('--mood2', mood.c2);

    moodEmoji.textContent = mood.emoji;
    moodName.textContent = mood.es;
    moodConf.textContent = 'Confianza: '+Math.round(top.v*100)+'%';
    if(top.key!==lastMood){
      msgIdx = Math.floor(Math.random()*mood.msg.length);
      moodMsg.textContent = mood.msg[msgIdx];
      suggestEl.innerHTML = mood.sug;
      lastMood = top.key;
    }

    // edad suavizada + género
    ageSmooth = ageSmooth==null ? r.age : ageSmooth*0.9 + r.age*0.1;
    ageVal.textContent = Math.round(ageSmooth);
    genderVal.textContent = r.gender==='male' ? 'Hombre' : 'Mujer';
  }

  function snapshot(){
    const c=document.createElement('canvas');
    c.width=video.videoWidth; c.height=video.videoHeight;
    const ctx=c.getContext('2d');
    ctx.translate(c.width,0); ctx.scale(-1,1);           // desespejar
    ctx.drawImage(video,0,0,c.width,c.height);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(overlay,0,0,c.width,c.height);          // overlay ya viene espejado en CSS; se compone visualmente
    const a=document.createElement('a');
    a.download='emocion-'+(lastMood||'captura')+'-'+Date.now()+'.png';
    a.href=c.toDataURL('image/png'); a.click();
  }

  buildBars();
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  snapBtn.addEventListener('click', snapshot);
})();
