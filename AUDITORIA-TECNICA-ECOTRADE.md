# Auditoría Técnica Exhaustiva - EcoTrade

Fecha: 2026-07-30

## Alcance revisado

Esta auditoría cubre:

- frontend React/Vite
- flujo de autenticación y autorización
- lógica de sesiones, operador y verificación pública
- emisión de recibos Solana
- esquema SQL, RLS, RPCs y storage de Supabase
- documentación técnica y README
- diseño e implementación real del Trust Score

Archivos base revisados:

- README.md
- Sesión de Reciclaje EcoTrade/src/lib/trustScore.ts
- Sesión de Reciclaje EcoTrade/src/lib/sessions.ts
- Sesión de Reciclaje EcoTrade/src/lib/operator.ts
- Sesión de Reciclaje EcoTrade/src/lib/solana.ts
- Sesión de Reciclaje EcoTrade/src/app/pages/PublicVerification.tsx
- Sesión de Reciclaje EcoTrade/src/app/pages/OperatorReviewQueue.tsx
- Sesión de Reciclaje EcoTrade/src/app/context/AuthContext.tsx
- Sesión de Reciclaje EcoTrade/guidelines/TrustScore-Antifraude.md
- Sesión de Reciclaje EcoTrade/api/emit-solana.ts
- EcoTradeApp/api/emit-solana.ts
- EcoTradeApp/package.json
- supabase/schema.sql
- supabase/rls.sql
- supabase/rpcs.sql
- supabase/storage.sql
- supabase/fix_invalid_receipts.sql

## Resultado ejecutivo

EcoTrade está bien encaminado como demo funcional de hackathon. Tiene una base razonable en autenticación, modelo de datos, RLS y una propuesta clara de trazabilidad pública. Pero todavía no está al 100% ni para operación seria ni para distribución con promesas fuertes de integridad, antifraude y emisión on-chain confiable.

El mayor problema no es visual ni estructural. Está en la capa de garantías: el proyecto afirma más de lo que hoy garantiza. Eso se ve sobre todo en dos frentes:

- Trust Score presentado como capa de IA, cuando la implementación real es un motor heurístico determinista de reglas fijas.
- Flujo on-chain no suficientemente blindado: la sesión puede cerrarse como completada aunque la emisión falle, y la API de emisión no autentica al operador en el servidor.

Conclusión corta:

- como demo de hackathon: sólido
- como MVP cerrable con pilotos pequeños: le faltan varios controles críticos
- como producto listo para distribución con claims de antifraude y prueba pública fuerte: todavía no

## Validación realizada

- Diagnósticos del editor: sin errores reportados en los dos proyectos revisados.
- Build frontend: se pudo iniciar correctamente con Vite, pero la terminal de este entorno en Windows devolvió salida truncada y no dejó una confirmación final limpia de término.
- No hay suite de tests configurada en los package.json revisados.

## Hallazgos críticos

### 1. La API de emisión Solana es pública y no autentica al operador en servidor

Evidencia:

- Sesión de Reciclaje EcoTrade/api/emit-solana.ts
- EcoTradeApp/api/emit-solana.ts

Observación:

Ambas funciones serverless aceptan POST con sessionId y usan service role de Supabase. No validan token de usuario, no verifican sesión autenticada del operador, no autorizan por rol en backend y exponen CORS abierto.

Impacto:

- cualquier cliente que alcance la URL puede intentar disparar emisión
- se rompe el supuesto de que sólo el operador aprueba y emite
- si el endpoint está desplegado públicamente, el control real queda delegado al frontend, lo cual no sirve como barrera de seguridad

Prioridad:

Crítica. Esto bloquea cualquier distribución seria.

### 2. Una sesión puede quedar Completada aunque falle la emisión on-chain

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/sessions.ts

Observación:

finalizarSesion primero actualiza la sesión a Completada, asigna ecoCoins, actualiza stats del perfil y calcula huella. Recién después intenta emitir el recibo Solana. Si la emisión falla, el error sólo se registra con console.warn y la sesión queda completada igual.

Impacto:

- contradice la promesa de que cada sesión verificada genera recibo inmutable
- produce sesiones cerradas sin prueba pública efectiva
- deja incoherencia entre estado de negocio y estado blockchain

Prioridad:

Crítica.

### 3. El Trust Score no es una capa de IA

Evidencia:

- README.md
- Sesión de Reciclaje EcoTrade/src/lib/trustScore.ts

Observación:

La implementación actual es un motor de reglas ponderadas con cinco señales y pesos fijos. No hay modelo predictivo, clasificación estadística, visión computacional, OCR, embeddings ni inferencia externa.

Impacto:

- claim técnico sobredimensionado
- riesgo reputacional ante jueces, partners o usuarios
- documentación y pitch quedan por delante de la realidad del producto

Prioridad:

Crítica a nivel de positioning y distribución.

### 4. La documentación del Trust Score no coincide con la implementación real

Evidencia:

- Sesión de Reciclaje EcoTrade/guidelines/TrustScore-Antifraude.md
- Sesión de Reciclaje EcoTrade/src/lib/trustScore.ts

Observación:

La guía describe controles que hoy no existen realmente en código. Ejemplos concretos:

- materials-compatible en la guía dice validar suma de kilogramos contra total; el código sólo verifica materiales aceptados por el punto
- kg-range en la guía dice considerar historial y outliers; el código sólo aplica totalKg > 0, límite parseado y hard stop sospechoso mayor a 100 kg
- evidence-attached en la guía dice exigir evidencia accesible y hash; el código sólo cuenta filas de session_evidence
- user-history en la guía habla de cancelaciones y sesiones conflictivas; el código sólo cuenta sesiones completadas previas
- raee-evidence en la guía menciona accesibilidad; el código sólo exige count >= 2

Impacto:

- se sobreestima la robustez antifraude
- la lógica de negocio queda difícil de defender técnicamente
- cualquier iteración futura se basa en una especificación falsa

Prioridad:

Crítica, porque afecta directamente la confianza en el sistema.

## Hallazgos altos

### 5. Duplicación de la API emit-solana con deriva funcional

Evidencia:

- Sesión de Reciclaje EcoTrade/api/emit-solana.ts
- EcoTradeApp/api/emit-solana.ts

Observación:

Existen dos implementaciones activas del mismo endpoint con diferencias reales:

- una usa payload v2 y agrega real_evidence_url
- la otra usa payload v1
- una resuelve cluster y RPC de forma más flexible
- la otra está más fija a devnet

Impacto:

- riesgo de comportamiento distinto entre local, wrapper y despliegue
- deuda operativa y bugs por correcciones aplicadas en un archivo y omitidas en el otro

Prioridad:

Alta.

### 6. retryPendingRecibos usa una columna que no existe en el schema revisado

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/solana.ts
- supabase/schema.sql

Observación:

retryPendingRecibos consulta retry_at en solana_receipts, pero esa columna no aparece en la tabla creada en schema.sql.

Impacto:

- el supuesto mecanismo de reintento no está alineado con la base real
- revela funcionalidad incompleta o código muerto

Prioridad:

Alta.

### 7. La verificación pública muestra conteo de evidencias incorrecto

Evidencia:

- Sesión de Reciclaje EcoTrade/src/app/pages/PublicVerification.tsx
- Sesión de Reciclaje EcoTrade/src/lib/sessions.ts

Observación:

PublicVerification renderiza EvidenceHash usando session.evidence?.length, pero getPublicSession no trae session_evidence ni llena evidence en PublicSessionData. Resultado: el conteo visible queda siempre en 0 aunque la sesión tenga pruebas.

Impacto:

- falla de integridad de UI
- la verificación pública comunica menos evidencia de la que realmente existe

Prioridad:

Alta.

### 8. El proyecto no tiene tests automatizados

Evidencia:

- Sesión de Reciclaje EcoTrade/package.json
- EcoTradeApp/package.json

Observación:

No hay scripts de test ni suite visible para:

- Trust Score
- RLS/RPCs
- flujo de aprobación operativa
- emisión y fallback de recibos
- verificación pública

Impacto:

- cada cambio en lógica crítica se valida casi sólo por prueba manual
- el costo de endurecer el sistema sube porque no hay red de seguridad

Prioridad:

Alta.

### 9. El flujo de cierre no es transaccional entre negocio y blockchain

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/sessions.ts
- EcoTradeApp/api/emit-solana.ts
- supabase/rpcs.sql

Observación:

No existe un orquestador transaccional fuerte. El cierre de la sesión toca múltiples piezas:

- recycling_sessions
- profiles
- carbon_footprint_offsets
- solana_receipts
- session_timeline

Si una parte falla en el medio, el sistema puede quedar parcialmente aplicado.

Impacto:

- inconsistencias difíciles de reparar
- necesidad de scripts manuales de corrección

Prioridad:

Alta.

### 10. La emisión on-chain persiste secretos operativos en una arquitectura frágil para producción

Evidencia:

- README.md
- Sesión de Reciclaje EcoTrade/api/emit-solana.ts
- EcoTradeApp/api/emit-solana.ts

Observación:

La clave operativa se lee desde env var SOLANA_OPERATOR_SEED. Eso puede ser aceptable en hackathon, pero no es una solución madura para operación real con fondos o reputación en juego.

Impacto:

- riesgo operativo alto si ese secreto se filtra
- no hay rotación ni auditoría de uso del signer

Prioridad:

Alta.

## Hallazgos medios

### 11. El componente de cola de revisión oculta parte del estado real del Trust Score

Evidencia:

- Sesión de Reciclaje EcoTrade/src/app/pages/OperatorReviewQueue.tsx

Observación:

El componente arma trustScore con requiresReview false y signals vacías, aunque el dato real existe en backend para ciertas vistas.

Impacto:

- la UI resume mal el riesgo
- un score visualmente alto puede esconder una falla crítica que igual requería revisión

Prioridad:

Media.

### 12. El hard threshold de 100 kg en kg-range es demasiado rígido

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/trustScore.ts

Observación:

kg-range marca como sospechoso cualquier total mayor a 100 kg, aun si el límite del punto admitiera más. Esto no usa percentiles, histórico ni categorías por punto.

Impacto:

- falsos positivos en centros con volúmenes mayores
- señal poco defendible cuando el sistema crezca

Prioridad:

Media.

### 13. El Trust Score actual no valida contenido de evidencia, geolocalización ni consistencia temporal

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/trustScore.ts

Observación:

El sistema hoy no comprueba:

- si la foto corresponde al material declarado
- si fue tomada en el punto de acopio
- si la fecha de captura es coherente con la sesión
- si hay reutilización de imágenes

Impacto:

- el score sirve para priorización básica, no como antifraude robusto

Prioridad:

Media.

### 14. La bucket pública es útil para demo, pero débil para una estrategia de privacidad y distribución seria

Evidencia:

- supabase/storage.sql

Observación:

El bucket session-evidence queda público para lectura. Eso simplifica verificación externa, pero puede tensionar privacidad y cumplimiento si hay fotos con personas, ubicaciones o información sensible.

Impacto:

- riesgo de exposición no deseada de evidencia
- obliga a revisar consentimiento, minimización y redacción operativa

Prioridad:

Media.

### 15. Hay desalineación menor entre comentarios y comportamiento real en sesiones

Evidencia:

- Sesión de Reciclaje EcoTrade/src/lib/sessions.ts

Observación:

Los comentarios de createSession todavía hablan de inserción en Borrador, pero el código inserta Pendiente de verificación. No rompe el flujo por sí solo, pero sí baja confiabilidad documental.

Prioridad:

Media.

## Hallazgos bajos

### 16. La estructura con dos carpetas activas complica mantenimiento y despliegue

Evidencia:

- README.md
- EcoTradeApp/package.json

Observación:

Hay una app React y un wrapper Vercel con sincronización de dist. Es entendible para hackathon, pero aumenta el riesgo de drift y confusión operativa.

Prioridad:

Baja.

### 17. La remediación de recibos inválidos es manual

Evidencia:

- supabase/fix_invalid_receipts.sql

Observación:

Existe script de ayuda, pero no un proceso automatizado de migración ni un job de saneamiento.

Prioridad:

Baja.

## Evaluación formal del Trust Score

## Qué sí hace bien hoy

- centraliza el cálculo en un módulo claro
- persiste score, nivel, señales y requiresReview
- define señales críticas
- marca sesiones para revisión cuando corresponde según su regla actual
- separa cómputo puro y persistencia, lo que facilita tests futuros

## Qué no cumple todavía

### 1. No cumple la promesa documental completa

El documento de guidelines describe un Trust Score más sofisticado que el realmente implementado. Hoy el score es útil como priorizador operativo simple, no como sistema de antifraude fuerte.

### 2. No valida coherencia material-total

La señal materials-compatible no verifica que la suma de materiales coincida con totalKg, aunque la guía lo afirma.

### 3. No usa historial real de riesgo

La señal user-history sólo cuenta sesiones completadas previas. No considera cancelaciones, disputas, rechazos ni sesiones previamente marcadas como conflictivas.

### 4. No valida evidencia utilizable

evidence-attached sólo cuenta registros. No verifica public_url, accesibilidad efectiva ni existencia de evidence_hash al momento del score.

### 5. No hay señales de contexto fuerte

Faltan señales que volverían serio el score para distribución:

- consistencia temporal
- proximidad geográfica
- reutilización de evidencia
- reputación de operador
- comportamiento anómalo multi-cuenta
- diferencia sistemática entre kg reportado y kg verificado

## Veredicto del Trust Score

Estado actual:

- como apoyo operativo de demo: sí funciona
- como clasificación básica de riesgo: sí, parcialmente
- como motor antifraude excelente: no
- como capa de IA: no

Calificación técnica del Trust Score actual:

- diseño modular: bueno
- capacidad antifraude real: media-baja
- explicabilidad: buena
- consistencia doc-código: baja
- aptitud para distribución seria: insuficiente sin v2

## Qué falta para que el proyecto esté cerca del 100%

## Bloque 1 - Imprescindible antes de distribución seria

1. Autenticar y autorizar la API emit-solana en backend.
2. Exigir rol operador real en servidor.
3. Impedir completar sesión si la emisión on-chain no quedó confirmada, o separar claramente estado de negocio y estado de emisión.
4. Unificar las dos implementaciones de emit-solana en una sola fuente de verdad.
5. Corregir README y material comercial: cambiar IA por heurísticas o implementar de verdad una capa inteligente.
6. Alinear guidelines de Trust Score con el código o viceversa.
7. Agregar tests mínimos de lógica crítica.
8. Resolver el mecanismo de retry de recibos con esquema real.

## Bloque 2 - Necesario para un MVP defendible

1. Trust Score v2 con señales realmente útiles.
2. Logging auditable de acciones de operador y emisión.
3. Reintentos confiables e idempotencia en emisión Solana.
4. Manejo explícito de recibos inválidos o legacy.
5. Validación fuerte de evidencia y hash.
6. Mejorar verificación pública para mostrar evidencia y estado real completos.

## Bloque 3 - Necesario para una distribución excelente

1. Gestión segura del signer operativo.
2. Política clara de privacidad para evidencias públicas.
3. Observabilidad y alertas.
4. Entornos de staging y producción con checklists operativos.
5. estrategia de migraciones y rollback
6. contrato técnico del endpoint de emisión

## Recomendación de implementación para Trust Score v2

Si realmente quieres que esta capa sea una fortaleza del producto, el siguiente salto no es meter un modelo por meterlo. Primero hay que endurecer señales verificables y explicables.

Orden correcto:

1. coherencia declarada vs verificada
2. consistencia de evidencia
3. comportamiento histórico del usuario
4. comportamiento histórico del operador
5. geografía y tiempo
6. detección de reutilización de imágenes
7. recién después, si aporta, una capa de clasificación asistida

Señales concretas recomendadas:

- delta reportado-verificado
- ratio de sesiones rechazadas del usuario
- ratio de incidencias por operador
- evidencia hash presente y estable
- evidencia mínima por tipo de material
- sesión fuera de horario del punto
- sesión muy lejos del punto
- múltiples sesiones similares en ventana corta

## Comparación con la referencia tipo Plastic Bank

La idea base es comparable en espíritu: trazabilidad, confianza y valor sobre reciclaje verificado. Pero para acercarse a un estándar tipo Plastic Bank, EcoTrade todavía necesita más capa operativa que capa visual.

Lo que hoy ya conversa bien con esa dirección:

- prueba pública verificable
- operador humano en el loop
- trazabilidad de materiales y kg
- señalización de confianza antes del cierre

Lo que falta para estar a un nivel mucho más serio:

- controles antifraude más duros
- trazabilidad operativa completa de quién aprobó qué
- consistencia contractual entre negocio y blockchain
- mejor gobierno de identidad operativa
- procesos de corrección y reemisión no manuales
- documentación y claims 100% alineados con lo construido

## Roadmap recomendado

## Fase 1 - Corrección de garantías

- blindar emit-solana
- unificar endpoint
- corregir cierre no transaccional
- corregir claims de IA
- corregir PublicVerification y retry_at

## Fase 2 - Confiabilidad

- tests unitarios del Trust Score
- tests de integración del flujo operador -> emisión
- idempotencia de emisión
- logging y auditoría de timeline completa

## Fase 3 - Excelencia funcional

- Trust Score v2
- mejor tratamiento de evidencias
- política de privacidad y acceso externo
- observabilidad y runbooks

## Veredicto final

EcoTrade tiene una propuesta potente y entendible. No le falta idea. Le faltan garantías técnicas para que la promesa sea tan fuerte como el discurso.

Hoy el proyecto está más cerca de:

- demo convincente con buena arquitectura base

que de:

- plataforma antifraude lista para distribución seria

La mejor decisión ahora no es agregar más features. Es cerrar el gap entre lo que el sistema dice que hace y lo que realmente garantiza.