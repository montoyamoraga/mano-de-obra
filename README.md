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

[piramide/](piramide/) es un subsitio: una pirámide de 1.015 copias del puño que crece al bajar por la página, con la ficha de un aviso de propiedades.

- [piramide/index.html](piramide/index.html): la página, con three.js desde jsDelivr.
- [piramide/puno.glb](piramide/puno.glb): el puño sin la tela, hecho con [piramide/recortar.py](piramide/recortar.py) (necesita numpy y Pillow):

```bash
python3 piramide/recortar.py 2026-10-07-mano-izq-puno.glb piramide/puno.glb
```

`hacer-sitio.mjs` copia `piramide/` al sitio, sin `recortar.py`.

Para agregar un escaneo, deja el `.glb` en la raíz y súmalo a `modelos` en `trompo.yml`.
