const { topExpr, translateMood } = require('../js/mood-utils');

describe('topExpr()', () => {
  test('identifica la emoción con mayor probabilidad', () => {
    const expr = { happy: 0.1, sad: 0.05, angry: 0.02, fearful: 0.01, disgusted: 0.01, surprised: 0.01, neutral: 0.8 };
    expect(topExpr(expr)).toEqual({ key: 'neutral', v: 0.8 });
  });

  test('detecta happy cuando es la probabilidad más alta', () => {
    const expr = { happy: 0.92, sad: 0.02, angry: 0.01, fearful: 0.01, disgusted: 0.01, surprised: 0.02, neutral: 0.01 };
    expect(topExpr(expr).key).toBe('happy');
  });

  test('maneja objetos con una sola clave', () => {
    expect(topExpr({ neutral: 0.99 })).toEqual({ key: 'neutral', v: 0.99 });
  });
});

describe('translateMood()', () => {
  test('traduce claves conocidas al español', () => {
    expect(translateMood('happy')).toBe('feliz');
    expect(translateMood('fearful')).toBe('con miedo');
  });

  test('retorna la clave original si no existe traducción', () => {
    expect(translateMood('unknown')).toBe('unknown');
  });
});