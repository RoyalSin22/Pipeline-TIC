// js/mood-utils.js
// Lógica pura extraída de script.js para poder testearla sin DOM ni cámara.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(); // Node / Jest
  } else {
    root.MoodUtils = factory(); // Navegador
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const MOODS_ES = {
    happy: 'feliz', sad: 'triste', angry: 'enojado', fearful: 'con miedo',
    disgusted: 'con disgusto', surprised: 'sorprendido', neutral: 'neutral'
  };

  /**
   * Determina la emoción dominante a partir del objeto de probabilidades
   * que retorna face-api.js (withFaceExpressions()).
   * @param {Object} expr - ej. {happy:0.8, sad:0.1, ...}
   * @returns {{key: string, v: number}}
   */
  function topExpr(expr) {
    let key = 'neutral', v = -1;
    for (const k in expr) {
      if (expr[k] > v) { v = expr[k]; key = k; }
    }
    return { key, v };
  }

  function translateMood(key) {
    return MOODS_ES[key] || key;
  }

  return { topExpr, translateMood, MOODS_ES };
});