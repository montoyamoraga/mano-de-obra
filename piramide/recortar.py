"""Recorta el puño de un escaneo de Scaniverse: deja la mano y la manga y
saca la tela sobre la que descansa, para poder apilar muchas copias.

La tela es casi un plano: se ajusta un plano a la tela que rodea el puño y
se quedan los triángulos cerca del puño que se levantan sobre ese plano, y de
ellos solo el pedazo conectado más grande. El modelo queda nivelado, con la
tela en y = 0. La textura se recorta a lo que usan esos triángulos y se
achica, así el modelo pesa poco.

Uso, desde la raíz del repositorio:
    python3 piramide/recortar.py 2026-10-07-mano-izq-puno.glb piramide/puno.glb
Necesita numpy y Pillow.
"""

import io
import json
import struct
import sys

import numpy as np
from PIL import Image

# Dónde está el puño en el escaneo (metros) y cuánto se deja a su alrededor.
CENTRO = np.array([0.03, -0.245, -0.12])
RADIO = 0.18
# Altura mínima sobre la tela para que un triángulo sea parte de la mano.
ALTURA = 0.015
LADO_TEXTURA = 1024


def leer_glb(ruta):
    datos = open(ruta, "rb").read()
    largo_json = struct.unpack("<I", datos[12:16])[0]
    gltf = json.loads(datos[20:20 + largo_json])
    binario = 20 + largo_json + 8

    def vista(i):
        v = gltf["bufferViews"][i]
        inicio = binario + v.get("byteOffset", 0)
        return datos[inicio:inicio + v["byteLength"]]

    def accesor(i, tipo, ancho):
        a = gltf["accessors"][i]
        return np.frombuffer(vista(a["bufferView"]), tipo).reshape(-1, ancho) if ancho > 1 else \
            np.frombuffer(vista(a["bufferView"]), tipo)

    primitiva = gltf["meshes"][0]["primitives"][0]
    posiciones = accesor(primitiva["attributes"]["POSITION"], np.float32, 3)
    uvs = accesor(primitiva["attributes"]["TEXCOORD_0"], np.float32, 2)
    indices = accesor(primitiva["indices"], np.uint32, 1).reshape(-1, 3)
    imagen = gltf["images"][gltf["textures"][0]["source"]]
    textura = Image.open(io.BytesIO(vista(imagen["bufferView"]))).convert("RGB")
    return posiciones, uvs, indices, textura


def pedazo_mas_grande(triangulos):
    """Los triángulos del grupo conectado (por vértices) más grande."""
    padre = np.arange(triangulos.max() + 1)

    def raiz(x):
        while padre[x] != x:
            padre[x] = padre[padre[x]]
            x = padre[x]
        return x

    for a, b, c in triangulos:
        for x, y in ((a, b), (a, c)):
            rx, ry = raiz(x), raiz(y)
            if rx != ry:
                padre[rx] = ry
    raices = np.array([raiz(a) for a in triangulos[:, 0]])
    valores, cuentas = np.unique(raices, return_counts=True)
    return triangulos[raices == valores[cuentas.argmax()]]


def escribir_glb(ruta, posiciones, uvs, indices, jpg):
    partes, vistas = [], []
    for bloque in (jpg, posiciones.astype(np.float32).tobytes(), uvs.astype(np.float32).tobytes(),
                   indices.astype(np.uint32).tobytes()):
        inicio = sum(len(p) for p in partes)
        vistas.append({"buffer": 0, "byteOffset": inicio, "byteLength": len(bloque)})
        partes.append(bloque + b"\0" * (-len(bloque) % 4))
    binario = b"".join(partes)
    gltf = {
        "asset": {"version": "2.0", "generator": "mano-de-obra recortar.py"},
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "puno", "mesh": 0}],
        "meshes": [{"name": "puno", "primitives": [{"mode": 4, "material": 0, "indices": 2,
                                                     "attributes": {"POSITION": 0, "TEXCOORD_0": 1}}]}],
        "materials": [{"name": "piel", "pbrMetallicRoughness": {"baseColorTexture": {"index": 0},
                                                                "metallicFactor": 0.0}}],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{}],
        "images": [{"bufferView": 0, "mimeType": "image/jpeg"}],
        "accessors": [
            {"bufferView": 1, "componentType": 5126, "count": len(posiciones), "type": "VEC3",
             "min": posiciones.min(0).tolist(), "max": posiciones.max(0).tolist()},
            {"bufferView": 2, "componentType": 5126, "count": len(uvs), "type": "VEC2"},
            {"bufferView": 3, "componentType": 5125, "count": indices.size, "type": "SCALAR"},
        ],
        "bufferViews": vistas,
        "buffers": [{"byteLength": len(binario)}],
    }
    texto = json.dumps(gltf, separators=(",", ":")).encode()
    texto += b" " * (-len(texto) % 4)
    total = 12 + 8 + len(texto) + 8 + len(binario)
    with open(ruta, "wb") as archivo:
        archivo.write(struct.pack("<III", 0x46546C67, 2, total))
        archivo.write(struct.pack("<II", len(texto), 0x4E4F534A) + texto)
        archivo.write(struct.pack("<II", len(binario), 0x004E4942) + binario)


def main(entrada, salida):
    posiciones, uvs, indices, textura = leer_glb(entrada)
    ancho, alto = textura.size

    # Plano de la tela: el que mejor pasa por el anillo que rodea al puño.
    distancias = np.linalg.norm(posiciones - CENTRO, axis=1)
    anillo = posiciones[(distancias > RADIO) & (distancias < RADIO + 0.1)]
    punto = anillo.mean(0)
    normal = np.linalg.svd(anillo - punto)[2][2]
    normal = normal if normal[1] > 0 else -normal
    alturas = (posiciones - punto) @ normal

    centros = posiciones[indices].mean(1)
    cerca = np.linalg.norm(centros - CENTRO, axis=1) < RADIO
    arriba = alturas[indices].mean(1) > ALTURA
    triangulos = pedazo_mas_grande(indices[cerca & arriba])

    # Girar para que la normal de la tela apunte hacia arriba (y).
    eje = np.cross(normal, [0, 1, 0])
    seno, coseno = np.linalg.norm(eje), normal[1]
    eje = eje / seno
    k = np.array([[0, -eje[2], eje[1]], [eje[2], 0, -eje[0]], [-eje[1], eje[0], 0]])
    giro = np.eye(3) + seno * k + (1 - coseno) * k @ k
    posiciones = (posiciones - punto) @ giro.T

    # Vértices nuevos, solo los que se usan.
    usados, nuevos = np.unique(triangulos, return_inverse=True)
    posiciones, uvs = posiciones[usados], uvs[usados]
    # El origen queda en el centro del puño, apoyado en y = 0.
    posiciones = posiciones - [*(posiciones.min(0) + posiciones.max(0))[[0]] / 2,
                               posiciones[:, 1].min(), *(posiciones.min(0) + posiciones.max(0))[[2]] / 2]

    # Textura: solo el rectángulo que usan los uvs, achicado.
    u0, v0 = uvs.min(0)
    u1, v1 = uvs.max(0)
    caja = (int(u0 * ancho), int(v0 * alto), int(np.ceil(u1 * ancho)), int(np.ceil(v1 * alto)))
    recorte = textura.crop(caja)
    escala = LADO_TEXTURA / max(recorte.size)
    if escala < 1:
        recorte = recorte.resize((round(recorte.size[0] * escala), round(recorte.size[1] * escala)),
                                 Image.LANCZOS)
    uvs = (uvs * [ancho, alto] - caja[:2]) / [caja[2] - caja[0], caja[3] - caja[1]]
    jpg = io.BytesIO()
    recorte.save(jpg, "JPEG", quality=88)

    escribir_glb(salida, posiciones, uvs, nuevos.reshape(-1, 3), jpg.getvalue())
    print(f"{salida}: {len(triangulos)} triángulos, textura {recorte.size[0]}x{recorte.size[1]}, "
          f"{np.ptp(posiciones, 0).round(3).tolist()} m")


if __name__ == "__main__":
    main(*sys.argv[1:3])
