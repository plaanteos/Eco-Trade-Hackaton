# Trust Score y Arquitectura Antifraude

## Objetivo

Este documento describe dos piezas centrales del diseño funcional de EcoTrade:

1. El modelo de Trust Score usado para priorizar revisión y reducir riesgo operativo antes del cierre de una sesión y de la emisión on-chain.
2. La arquitectura antifraude para evidencia fotográfica, diseñada para una aplicación web que puede utilizarse tanto desde computadoras como desde dispositivos móviles.

La premisa central es simple: el sistema no pretende afirmar verdad absoluta, sino reducir riesgo, aumentar trazabilidad y elevar el costo del fraude.

---

## Principios de diseño

### 1. El Trust Score no reemplaza la revisión humana
El score es una herramienta de apoyo para clasificar riesgo. No constituye por sí mismo una prueba definitiva de legitimidad.

### 2. Las señales deben ser explicables
Cada señal debe poder responder cuatro preguntas:

- Qué mide.
- Qué datos utiliza.
- Cuándo aprueba.
- Cuándo falla.

### 3. Las señales críticas dominan sobre el promedio
No todas las señales tienen el mismo impacto. Algunas fallas son suficientemente sensibles como para requerir revisión aunque el puntaje total no sea bajo.

### 4. La evidencia fotográfica no se valida de forma binaria
No existe un mecanismo perfecto para garantizar que una imagen no fue generada o alterada con IA. La solución correcta es por capas: contexto, consistencia, trazabilidad y revisión.

---

## Modelo de Trust Score

### Propósito
El Trust Score evalúa el nivel de confianza de una sesión de reciclaje antes de su validación final. Su función es:

- detectar inconsistencias tempranas,
- priorizar revisión manual,
- reducir la probabilidad de fraude o error operativo,
- evitar emisión on-chain de sesiones con señales débiles.

### Resultado esperado
El sistema produce:

- un puntaje numérico de 0 a 100,
- un nivel cualitativo: Alta, Media o Baja,
- un conjunto de señales evaluadas,
- una marca booleana `requiresReview`.

### Regla general de interpretación

- Alta: sesión consistente, sin señales relevantes de riesgo.
- Media: sesión utilizable, pero con condiciones que ameritan atención.
- Baja: sesión con inconsistencias significativas o baja confiabilidad.
- `requiresReview`: obliga revisión antes de cerrar o emitir on-chain.

### Pesos actuales

- materials-compatible: 25 puntos
- kg-range: 25 puntos
- evidence-attached: 20 puntos
- user-history: 20 puntos
- raee-evidence: 15 puntos

### Señales críticas
Las señales críticas no se consideran equivalentes al resto. Si fallan, la sesión requiere revisión aunque el score global no sea bajo.

Señales críticas:

- materials-compatible
- raee-evidence

---

## Las 5 señales

## 1. materials-compatible

### Qué mide
Evalúa si los materiales declarados por la sesión son compatibles con el punto de acopio elegido y si la composición declarada es coherente con el total reportado.

### Datos utilizados

- `session_materials.material_type`
- `session_materials.kg`
- `recycling_sessions.total_kg`
- `collection_points.accepted_materials`

### Condiciones de aprobación
Aprueba cuando:

- existe al menos un material declarado,
- todos los materiales están permitidos por el punto,
- la suma de kilogramos por material coincide razonablemente con el total declarado.

### Condiciones de falla
Falla cuando:

- no hay materiales cargados,
- existe al menos un material no aceptado por el punto,
- la suma de los materiales no coincide con el total de la sesión.

### Justificación
Esta señal ataca uno de los errores más básicos y relevantes del flujo: declarar una sesión inconsistente desde el origen.

### Tipo
Crítica.

---

## 2. kg-range

### Qué mide
Evalúa si el volumen declarado es razonable en función del punto de acopio y del historial del usuario.

### Datos utilizados

- `recycling_sessions.total_kg`
- `collection_points.limits`
- historial previo del usuario en `recycling_sessions`
- promedio histórico de sesiones completadas

### Condiciones de aprobación
Aprueba cuando:

- el peso es mayor a 0,
- no supera el límite del punto cuando el punto tiene límite explícito,
- no constituye un outlier fuerte respecto del historial del usuario,
- no supera un umbral absoluto operativo considerado absurdo.

### Condiciones de falla
Falla cuando:

- el peso es 0 o negativo,
- supera el límite del punto,
- es anómalamente alto respecto del comportamiento histórico del usuario,
- cae en una magnitud operativa no creíble.

### Justificación
Un volumen incoherente es una de las señales más útiles para detectar fraude, error de carga o necesidad de control manual.

### Tipo
No crítica, pero de alto peso.

---

## 3. evidence-attached

### Qué mide
Evalúa si la sesión tiene evidencia registrada y utilizable, no solo una intención de evidencia.

### Datos utilizados

- `session_evidence`
- `session_evidence.public_url`
- `recycling_sessions.evidence_hash`

### Condiciones de aprobación
Aprueba cuando:

- existe al menos una evidencia registrada,
- al menos una evidencia es accesible,
- idealmente existe hash calculado del conjunto de evidencias.

### Condiciones de falla
Falla cuando:

- no hay evidencias,
- las evidencias no están accesibles,
- la sesión depende de archivos que no quedaron correctamente registrados.

### Justificación
No alcanza con tener una fila en la base. La evidencia debe existir en forma trazable y usable.

### Tipo
No crítica.

---

## 4. user-history

### Qué mide
Evalúa si el usuario tiene un historial operativo confiable.

### Datos utilizados

- sesiones previas del usuario en `recycling_sessions`
- cantidad de sesiones completadas,
- cantidad de sesiones canceladas,
- cantidad de sesiones cuyo trust score previo requirió revisión.

### Condiciones de aprobación
Aprueba cuando:

- es el primer reciclaje y por lo tanto el historial se considera neutro,
- o el usuario acumula más sesiones completadas que incidentes relevantes.

### Condiciones de falla
Falla cuando:

- el historial muestra demasiadas cancelaciones,
- el historial muestra reiteradas sesiones con revisión requerida,
- no existe una señal operativa de confiabilidad suficiente.

### Justificación
No se busca castigar al usuario nuevo, pero sí reflejar patrones de comportamiento repetidos.

### Tipo
No crítica.

---

## 5. raee-evidence

### Qué mide
Refuerza el requisito de evidencia cuando la sesión incluye materiales RAEE.

### Datos utilizados

- materiales declarados,
- cantidad de evidencias registradas,
- accesibilidad de esas evidencias.

### Condiciones de aprobación
Aprueba cuando:

- la sesión contiene RAEE,
- existen al menos dos evidencias registradas y accesibles.

### Condiciones de falla
Falla cuando:

- la sesión contiene RAEE y no alcanza el mínimo reforzado de evidencia.

### Justificación
Los RAEE tienen un riesgo mayor de falsificación, reuso de evidencia o documentación insuficiente. Por eso exigen un criterio más estricto.

### Tipo
Crítica.

---

## Regla de score y revisión

El puntaje se calcula de forma ponderada sobre las señales evaluadas.

### Regla de score

- se suman los pesos de las señales aprobadas,
- se divide por el total de pesos evaluados,
- se redondea a un entero entre 0 y 100.

### Conversión a nivel

- 80 o más: Alta
- 50 a 79: Media
- menos de 50: Baja

### Regla de revisión obligatoria
La sesión requiere revisión cuando:

- falla una señal crítica, o
- el nivel final es Baja.

Esto evita que una sesión con promedio aceptable pase automáticamente si presenta una inconsistencia sensible.

---

## Limitaciones del modelo actual

El modelo actual es más serio que una heurística superficial, pero sigue teniendo límites claros.

### Limitaciones principales

- No valida semánticamente el contenido visual de la imagen.
- No puede asegurar por sí solo que una foto no fue generada o alterada con IA.
- No detecta automáticamente reuso de imágenes entre usuarios o sesiones si no se incorpora comparación de hashes o similitud perceptual.
- No incluye todavía una evaluación forense profunda del archivo.
- No reemplaza la verificación presencial del operador.

Estas limitaciones deben quedar explícitas en la documentación académica para no sobredimensionar el alcance del sistema.

---

# Arquitectura Antifraude para Evidencia Fotográfica

## Objetivo
Reducir el riesgo de fraude fotográfico en una aplicación web usable tanto desde escritorio como desde móvil, sin depender de una captura obligatoria desde cámara nativa dentro de la app.

La restricción de contexto es importante: al poder usarse desde una computadora, no es razonable basar la estrategia en el supuesto de que toda evidencia provendrá de cámara integrada o captura directa en la aplicación.

Por eso la arquitectura propuesta se apoya en trazabilidad, consistencia, evidencia contextual y verificación multicapa.

---

## Enfoque general

La arquitectura antifraude no intenta resolver una única pregunta binaria.

No pregunta:

- “¿Esta imagen es auténtica al 100%?”

Pregunta algo más útil operativamente:

- “¿Cuánto riesgo presenta esta evidencia?”
- “¿Tiene trazabilidad suficiente?”
- “¿Es consistente con la sesión declarada?”
- “¿Debe escalarse a revisión?”

---

## Capas de control propuestas

## Capa 1. Registro estructurado de evidencia

Cada imagen debe registrarse con atributos verificables:

- session_id
- storage_path
- public_url o signed URL
- file_name
- uploaded_at
- evidence_hash del conjunto

### Propósito
Trazabilidad básica y control de integridad.

### Valor
Impide que la evidencia sea simplemente “una foto cualquiera” sin rastro de origen dentro del sistema.

---

## Capa 2. Requisitos contextuales de captura

Dado que la app puede usarse desde una computadora, no se exige “captura desde cámara in-app”. En su lugar, se exigen reglas de contexto visibles en la evidencia.

### Requisitos recomendados

- incluir un código de sesión visible,
- incluir una nota manuscrita o impresa con identificador de sesión,
- incluir múltiples ángulos en casos sensibles,
- incluir plano general y detalle en RAEE,
- incluir serial o etiqueta cuando aplique.

### Propósito
Aumentar el costo de fabricar evidencia reutilizable o generada artificialmente.

### Valor
Aunque no elimina el fraude, hace mucho más difícil falsificar evidencia convincente a bajo costo.

---

## Capa 3. Validación técnica del archivo

### Señales técnicas recomendadas

- presencia o ausencia de metadatos EXIF,
- resolución coherente,
- nombre de archivo y patrón temporal razonable,
- consistencia entre fecha de subida y fecha de sesión,
- software de edición reportado en metadatos cuando exista,
- formatos o compresiones anómalas.

### Propósito
Detectar indicios técnicos de manipulación o de archivos preparados fuera del flujo normal.

### Valor
No prueba fraude por sí sola, pero agrega señales útiles al análisis de riesgo.

---

## Capa 4. Integridad criptográfica

### Estrategia

- calcular hash por archivo,
- calcular hash compuesto por sesión,
- persistir el hash en la base,
- usar ese hash como referencia auditable y eventualmente como parte de la emisión on-chain.

### Propósito
Asegurar que la evidencia registrada no cambie silenciosamente.

### Valor
No demuestra autenticidad de origen, pero sí garantiza integridad posterior al registro.

---

## Capa 5. Reglas reforzadas por tipo de material

El riesgo no es igual para todos los materiales.

### Ejemplo

- plástico o papel doméstico: exigencia base,
- metal en gran volumen: exigencia media,
- RAEE: exigencia reforzada.

### Para RAEE
Se recomienda exigir:

- mínimo dos evidencias,
- detalle de equipo,
- vista general del conjunto,
- serial o etiqueta si existe,
- eventual revisión humana obligatoria cuando el trust score no sea alto.

### Propósito
Concentrar controles donde el fraude tiene más impacto.

---

## Capa 6. Detección de IA o manipulación como señal auxiliar

## Principio clave
No debe modelarse como una verdad absoluta.

### Enfoque correcto
Usar detectores forenses o clasificadores de manipulación como una señal adicional de riesgo, nunca como criterio único de aceptación o rechazo.

### Posibles insumos futuros

- modelos de detección de imágenes generadas,
- análisis de ruido y compresión,
- detección de artefactos de difusión,
- comparación perceptual contra repositorios previos.

### Justificación
Los detectores de IA tienen falsos positivos y falsos negativos. Son útiles como heurística complementaria, no como juez final.

---

## Capa 7. Revisión humana focalizada

La revisión humana debe reservarse para los casos con mayor retorno operativo.

### Casos típicos de escalamiento

- trust score medio o bajo,
- falla de señal crítica,
- RAEE con evidencia insuficiente,
- peso anómalo respecto del historial,
- archivos con señales técnicas sospechosas,
- evidencia reutilizada o demasiado similar a sesiones previas.

### Propósito
Optimizar esfuerzo humano en los casos donde más valor agrega.

---

## Propuesta de señales antifraude futuras

Estas señales pueden incorporarse al trust score en una evolución posterior:

- evidence-context-visible
- evidence-multi-angle
- evidence-metadata-consistent
- evidence-hash-present
- evidence-forensic-risk-low
- evidence-not-reused

Estas señales no requieren cambiar el principio del sistema; solo agregan más capacidad de discriminación.

---

## Diseño recomendado para aplicación web escritorio + móvil

Dado que el sistema debe funcionar desde computadora y no siempre desde cámara móvil, la estrategia recomendada es:

- permitir upload web estándar,
- exigir condiciones visibles de contexto dentro de la foto,
- calcular hash e integridad inmediatamente,
- almacenar evidencia con trazabilidad completa,
- endurecer requisitos según material y riesgo,
- escalar a revisión humana cuando corresponda.

Este enfoque es más realista y defendible que basar toda la confianza en “foto tomada dentro de la app”.

---

## Conclusión

El sistema antifraude propuesto no intenta prometer imposibles. Su fortaleza está en combinar:

- reglas de negocio,
- consistencia operativa,
- trazabilidad de evidencia,
- integridad criptográfica,
- análisis técnico,
- revisión humana selectiva.

Eso lo vuelve razonable para un entorno real y defendible en una tesis, porque reconoce límites técnicos y a la vez ofrece una estrategia concreta de mitigación de fraude.

---

## Resumen para memoria técnica o tesis

EcoTrade implementa un modelo de confianza y control antifraude basado en señales explícitas y auditables. El Trust Score no reemplaza la decisión humana, sino que organiza el riesgo de cada sesión mediante cinco dimensiones: compatibilidad material, consistencia volumétrica, evidencia accesible, historial operativo y control reforzado para residuos RAEE. Complementariamente, la arquitectura antifraude de evidencia fotográfica utiliza trazabilidad estructurada, integridad criptográfica, reglas contextuales de captura y revisión escalonada, lo que permite reducir fraude sin asumir capacidades irreales de detección absoluta de imágenes generadas por IA.
