// Simplifica el puño que deja recortar.py, para que la pila aguante más
// manos antes de que el navegador se ponga lento. Usa meshoptimizer, que
// cuida los uvs y los bordes de los parches de la textura.
//
// Uso, desde la raíz del repositorio, después de `npm install`:
//   node piramide/simplificar.mjs piramide/puno.glb piramide/puno.glb [FRACCION]
//
// FRACCION es la parte de los triángulos que se queda (por defecto 0.25).

import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from 'meshoptimizer';

const [entrada, salida, textoFraccion = '0.25'] = process.argv.slice(2);
const FRACCION = Number(textoFraccion);
// Cuánto pesa no deformar los uvs frente a no deformar la forma.
const PESO_UV = 0.5;

// Lectura de un GLB de una sola malla con posiciones, uvs, índices y una
// textura, como los que escribe recortar.py.
const datos = readFileSync(entrada);
const largoJson = datos.readUInt32LE(12);
const gltf = JSON.parse(datos.subarray(20, 20 + largoJson).toString());
const inicioBinario = 20 + largoJson + 8;

function vista(i) {
  const v = gltf.bufferViews[i];
  const inicio = inicioBinario + (v.byteOffset ?? 0);
  return datos.subarray(inicio, inicio + v.byteLength);
}
function accesor(i, Tipo) {
  const bytes = vista(gltf.accessors[i].bufferView);
  return new Tipo(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const primitiva = gltf.meshes[0].primitives[0];
const posiciones = accesor(primitiva.attributes.POSITION, Float32Array);
const uvs = accesor(primitiva.attributes.TEXCOORD_0, Float32Array);
const indices = accesor(primitiva.indices, Uint32Array);
const imagen = gltf.images[gltf.textures[0].source];
const jpg = vista(imagen.bufferView);

await MeshoptSimplifier.ready;
const meta = Math.floor((indices.length / 3) * FRACCION) * 3;
const [simples, error] = MeshoptSimplifier.simplifyWithAttributes(
  indices, posiciones, 3, uvs, 2, [PESO_UV, PESO_UV], null, meta, 0.05,
);

// Solo los vértices que se siguen usando.
const nuevoIndice = new Map();
const nuevasPosiciones = [], nuevosUvs = [];
const nuevosIndices = new Uint32Array(simples.length);
simples.forEach((viejo, k) => {
  if (!nuevoIndice.has(viejo)) {
    nuevoIndice.set(viejo, nuevoIndice.size);
    nuevasPosiciones.push(posiciones[viejo * 3], posiciones[viejo * 3 + 1], posiciones[viejo * 3 + 2]);
    nuevosUvs.push(uvs[viejo * 2], uvs[viejo * 2 + 1]);
  }
  nuevosIndices[k] = nuevoIndice.get(viejo);
});

// Escritura: los mismos materiales y textura, con la malla nueva.
const bloques = [jpg, Buffer.from(new Float32Array(nuevasPosiciones).buffer),
  Buffer.from(new Float32Array(nuevosUvs).buffer), Buffer.from(nuevosIndices.buffer)];
const partes = [];
gltf.bufferViews = [];
let desplazamiento = 0;
for (const bloque of bloques) {
  gltf.bufferViews.push({ buffer: 0, byteOffset: desplazamiento, byteLength: bloque.length });
  const relleno = Buffer.alloc((4 - (bloque.length % 4)) % 4);
  partes.push(bloque, relleno);
  desplazamiento += bloque.length + relleno.length;
}
const binario = Buffer.concat(partes);
const minimo = [0, 1, 2].map((e) => Math.min(...nuevasPosiciones.filter((_, k) => k % 3 === e)));
const maximo = [0, 1, 2].map((e) => Math.max(...nuevasPosiciones.filter((_, k) => k % 3 === e)));
gltf.images = [{ bufferView: 0, mimeType: 'image/jpeg' }];
gltf.textures = [{ source: 0, sampler: 0 }];
gltf.accessors = [
  { bufferView: 1, componentType: 5126, count: nuevasPosiciones.length / 3, type: 'VEC3', min: minimo, max: maximo },
  { bufferView: 2, componentType: 5126, count: nuevosUvs.length / 2, type: 'VEC2' },
  { bufferView: 3, componentType: 5125, count: nuevosIndices.length, type: 'SCALAR' },
];
gltf.meshes[0].primitives = [{ ...primitiva, attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2 }];
gltf.buffers = [{ byteLength: binario.length }];

let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, ' ')]);
const encabezado = Buffer.alloc(12);
encabezado.writeUInt32LE(0x46546c67, 0);
encabezado.writeUInt32LE(2, 4);
encabezado.writeUInt32LE(12 + 8 + json.length + 8 + binario.length, 8);
const trozo = (largo, tipo) => { const b = Buffer.alloc(8); b.writeUInt32LE(largo, 0); b.writeUInt32LE(tipo, 4); return b; };
writeFileSync(salida, Buffer.concat([encabezado, trozo(json.length, 0x4e4f534a), json, trozo(binario.length, 0x004e4942), binario]));

console.log(`${salida}: ${indices.length / 3} → ${nuevosIndices.length / 3} triángulos, error ${error.toFixed(4)}`);
