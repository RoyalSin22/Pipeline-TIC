// build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('▶ Iniciando compilación/empaquetado...');

// 1. Validar sintaxis JS (falla el build si hay errores)
execSync('node --check script.js', { stdio: 'inherit' });
execSync('node --check js/mood-utils.js', { stdio: 'inherit' });

// 2. Armar artefacto en dist/
const DIST = path.join(__dirname, 'dist');
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'js'), { recursive: true });

['index.html', 'style.css', 'script.js'].forEach(f => fs.copyFileSync(f, path.join(DIST, f)));
fs.copyFileSync('js/mood-utils.js', path.join(DIST, 'js', 'mood-utils.js'));

console.log('✔ Compilación completada. Artefacto listo en /dist');