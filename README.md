# mano-de-obra

Escaneos 3D de manos, hechos con Scaniverse, y un sitio con videos de tornamesa de cada uno, dibujados con [trompo](https://github.com/piruetasxyz/trompo).

## Sitio

En cada push a `main`, [.github/workflows/sitio.yml](.github/workflows/sitio.yml) dibuja los videos y publica el sitio en GitHub Pages, como [kicad-visor-demo](https://github.com/piruetasxyz/kicad-visor-demo). Los videos no se guardan en el repositorio.

- [trompo.yml](trompo.yml): qué videos se dibujan de cada modelo (giros, medidas, fondos).
- [hacer-sitio.mjs](hacer-sitio.mjs): escribe `_sitio/index.html` con los videos que hay en `_sitio/videos`.

Para verlo en tu computador, con trompo clonado:

```bash
node ruta/a/trompo/bin/trompo.js   # o `trompo`, si está instalado
node hacer-sitio.mjs
open _sitio/index.html
```

## Pirámide

[piramide/](piramide/) es un subsitio: copias del puño caen sin parar sobre una pila que crece como pirámide, cada vez más rápido, hasta llenar la pantalla. No tiene tope: con miles de manos el navegador se pone lento.

- [piramide/index.html](piramide/index.html): la página, con three.js desde jsDelivr.
- [piramide/puno.glb](piramide/puno.glb): el puño con un círculo de la tela, recortado con [piramide/recortar.py](piramide/recortar.py) (necesita numpy y Pillow) y simplificado a un cuarto de los triángulos con [piramide/simplificar.mjs](piramide/simplificar.mjs) (necesita `npm install`):

```bash
python3 piramide/recortar.py 2026-10-07-mano-izq-puno.glb piramide/puno.glb
node piramide/simplificar.mjs piramide/puno.glb piramide/puno.glb
```

`hacer-sitio.mjs` copia `piramide/` al sitio, sin esos dos programas.

Para agregar un escaneo, deja el `.glb` en la raíz y súmalo a `modelos` en `trompo.yml`.
