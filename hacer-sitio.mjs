// Escribe _sitio/index.html con los videos que trompo dejó en _sitio/videos,
// con el mismo estilo que los sitios de kicad-visor.
//
// La página se arma con lo que hay en la carpeta, no con trompo.yml: los
// videos se agrupan por medida (cuadrado, vertical) y se nombran como los
// nombra trompo, <modelo>-<eje>-<sentido>-<medida>-<fondo>.mp4.
//
// También copia los subsitios, como piramide/.
//
// Uso: node hacer-sitio.mjs

import { copyFileSync, cpSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CARPETA_SITIO = '_sitio';
const CARPETA_VIDEOS = path.join(CARPETA_SITIO, 'videos');
const TITULO = 'mano de obra';
const MODELOS = readdirSync('.').filter((nombre) => /\.(glb|gltf|stl|obj|ply)$/i.test(nombre));

const ESTILO = `
:root {
  --bg: #ffffff; --fg: #1d1d1b; --muted: #6b6b66; --card: #f3f2ee;
  --line: #e2e0da; --link: #1d1d1b;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161615; --fg: #ecebe6; --muted: #9a9993; --card: #222220;
    --line: #333331; --link: #ecebe6;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
}
main { max-width: 1200px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 2rem; margin: 8px 0 8px; overflow-wrap: anywhere; }
h2 {
  font-size: 1.1rem; text-transform: lowercase; letter-spacing: .04em;
  color: var(--muted); border-top: 1px solid var(--line);
  padding-top: 16px; margin: 40px 0 16px;
}
a { color: var(--link); }
.intro { color: var(--muted); margin: 0 0 24px; }
.grid {
  display: grid; gap: 16px; align-items: start;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
}
.grid.vertical { grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); }
figure {
  margin: 0; min-width: 0; background: var(--card); border-radius: 8px; overflow: hidden;
}
.media video { width: 100%; height: auto; display: block; }
figcaption {
  padding: 8px 12px; font-size: .875rem; display: flex; gap: 8px;
  flex-wrap: wrap; justify-content: space-between; overflow-wrap: anywhere;
}
figcaption span { color: var(--muted); }
footer { margin-top: 64px; color: var(--muted); font-size: .875rem; }
`;

// Los videos solo corren mientras se ven en pantalla.
const GUION = `
const visto = new IntersectionObserver((entradas) => {
  for (const e of entradas) e.isIntersecting ? e.target.play() : e.target.pause();
}, { threshold: 0.25 });
document.querySelectorAll("video").forEach((v) => visto.observe(v));
`;

const escapar = (texto) => texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const enlace = (ruta) => ruta.split('/').map(encodeURIComponent).join('/');

// Videos de la carpeta, en el orden en que trompo los dibujó, agrupados por
// medida: el penúltimo trozo del nombre.
const videos = readdirSync(CARPETA_VIDEOS)
  .filter((nombre) => nombre.endsWith('.mp4'))
  .sort((a, b) => statSync(path.join(CARPETA_VIDEOS, a)).mtimeMs - statSync(path.join(CARPETA_VIDEOS, b)).mtimeMs
    || a.localeCompare(b));
const porMedida = new Map();
for (const nombre of videos) {
  const medida = path.parse(nombre).name.split('-').at(-2);
  if (!porMedida.has(medida)) porMedida.set(medida, []);
  porMedida.get(medida).push(nombre);
}

const secciones = [...porMedida].map(([medida, nombres]) => {
  const figuras = nombres.map((nombre) => {
    const ruta = enlace(`videos/${nombre}`);
    return `<figure><div class="media"><video src="${ruta}" muted loop playsinline preload="metadata"></video></div>`
      + `<figcaption>${escapar(path.parse(nombre).name)}<span><a href="${ruta}">mp4</a></span></figcaption></figure>`;
  }).join('\n');
  return `<h2>${escapar(medida)}</h2>\n<div class="grid ${escapar(medida)}">\n${figuras}\n</div>`;
});

// El modelo también se publica, para descargarlo.
for (const modelo of MODELOS) copyFileSync(modelo, path.join(CARPETA_SITIO, modelo));
const descargas = MODELOS.map((modelo) => `<a href="${enlace(modelo)}">${escapar(modelo)}</a>`).join(', ');

// Subsitios: carpetas con su propio index.html, copiadas tal cual. Lo que
// no es para publicar (como recortar.py) se queda fuera.
const SUBSITIOS = ['piramide'];
for (const subsitio of SUBSITIOS) {
  cpSync(subsitio, path.join(CARPETA_SITIO, subsitio), {
    recursive: true,
    filter: (ruta) => !ruta.endsWith('.py'),
  });
}

const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(TITULO)}</title>
<style>${ESTILO}</style>
</head>
<body>
<main>
<h1>${escapar(TITULO)}</h1>
<p class="intro">Escaneos 3D de manos, hechos con Scaniverse. Modelo: ${descargas}.
También: <a href="piramide/index.html">pirámide</a>.</p>
${secciones.join('\n')}
<footer>hecho con <a href="https://github.com/piruetasxyz/trompo">trompo</a></footer>
</main>
<script>${GUION}</script>
</body>
</html>
`;

writeFileSync(path.join(CARPETA_SITIO, 'index.html'), pagina);
console.log(`${path.join(CARPETA_SITIO, 'index.html')}: ${videos.length} videos`);
