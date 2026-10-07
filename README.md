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

Para agregar un escaneo, deja el `.glb` en la raíz y súmalo a `modelos` en `trompo.yml`.
