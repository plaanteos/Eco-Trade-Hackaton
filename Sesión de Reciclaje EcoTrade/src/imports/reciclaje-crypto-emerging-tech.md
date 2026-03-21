Prompt definitivo (para pegar en Figma) — Extensión Crypto (Solana) + Emerging Tech sobre tu vertical “Sesión de Reciclaje”
Contexto: Ya existe el diseño base de “Sesión de Reciclaje” (entrega en punto, materiales fijos, KG, estética editorial/periódico premium). No rediseñes todo. Solo agrega la capa hackathon: prueba on-chain en Solana + verificación asistida (IA/heurísticas) + revisión.

1) Objetivo de esta iteración
Añadir a la vertical “Sesión de Reciclaje”:

Crypto Track (Solana devnet): emitir un Recibo Verificable on-chain y permitir verificación pública por QR/enlace.
Emerging Tech: score de confianza explicable + estado “pendiente de verificación” + cola de revisión para operador/admin.
Mantener la dirección de arte editorial newsprint premium: filetes (líneas finas), sellos de tinta, ticket perforado, serif en titulares + sans para UI, paleta limitada (marfil/negro/gris + acento verde botella). Evitar UI genérica (sin glassmorphism, sin gradientes pastel, sin sombras suaves, sin cards SaaS estándar).

2) Crypto Track (Solana) — “Recibo Verificable on-chain”
2.1 Momento de emisión
La emisión ocurre solo después de que el operador del punto verifique los KG finales. Si falta verificación, no se emite.

2.2 Datos que el recibo debe representar
sessionId
punto de acopio (nombre + dirección)
fecha/hora
materiales (catálogo fijo) + KG por material (decimales)
totalKg
ecoCoins ganados (floor(totalKg/10))
evidenceHash (hash/CID de evidencia)
verifiedBy (operador/punto)
2.3 Etiquetas Solana (texto exacto en UI)
En el bloque técnico, usar:

Cluster: devnet
Transaction Signature: (cadena)
Explorer: “Solana Explorer”
(Opcional) Program: “Memo Program” / “Custom Program ID” (si aplica)
2.4 Componentes obligatorios (diseñar como sistema)
Recibo/Ticket on-chain (Hero)
Ticket con perforado + numeración grande: “Sesión No. 000184”
Sello grande: ON-CHAIN VERIFIED
Campos: Total KG, EcoCoins, Punto, Fecha/Hora
Bloque “Solana devnet” con:
Transaction Signature (copiar)
Botón Ver en Solana Explorer
Botón Copiar signature
QR: “Verificar recibo”
Panel “Evidencia anclada”
Mini galería de fotos (si existen)
Campo: Evidence Hash (SHA-256 / CID) + copiar
Microcopy: “La cadena prueba integridad por hash. No expone datos privados.”
Pantalla pública (sin login): “Verificar recibo”
Encabezado editorial: “Verificación pública”
Sello: RECIBO VERIFICADO EN SOLANA
Resumen claro (punto, fecha, totalKg, ecoCoins)
Tabla de materiales (inventario)
Bloque técnico colapsable con Cluster + Signature + link a Explorer
Privacidad: no mostrar email/teléfono; solo lo necesario
2.5 Estados a diseñar (reales, no genéricos)
“Emitiendo recibo en Solana…” (loading sobrio)
“Pendiente on-chain” (sesión verificada, pero sin signature aún)
“No se pudo emitir en Solana” (error + reintentar + conservar estado)
“Verificación on-chain exitosa” (confirmación)
3) Emerging Tech — “Confianza + revisión asistida”
3.1 Score de confianza
Crear un módulo de Score 0–100 + nivel:

Alta / Media / Baja
Debe ser explicable (mostrar señales).
3.2 Señales (checklist explicable)
Mostrar una lista tipo bitácora / checklist editorial:

“Materiales compatibles con el punto”
“KG dentro de rango habitual”
“Evidencia adjunta y legible”
“Historial de entregas verificadas”
(Opcional) “RAEE requiere evidencia extra” (si electrónicos)
3.3 Estado “Pendiente de verificación”
Si score es bajo o hay señales críticas:

La sesión entra en Pendiente de verificación antes de “Completada on-chain”.
UI con banner editorial: “Requiere revisión manual antes de emitir recibo on-chain”.
Acciones por rol:
Operador: “Revisar”, “Aprobar y emitir en Solana”, “Marcar incidencia”
Usuario: “Agregar evidencia”, “Corregir KG” (si corresponde)
4) Operador/Admin — Cola de revisión (panel operativo)
Diseñar pantallas específicas para operador:

Cola de revisión
Tabla editorial (no cards) con columnas:
Score, Estado, Punto, Total KG, Fecha, “Pendiente on-chain”
Filtros:
“Baja confianza”
“KG alto”
“Sin evidencia”
“Pendiente on-chain”
Detalle de revisión
Comparación “Reportado vs Verificado”
Edición de KG verificados (tabla inventario)
Campo “Nota del operador”
Decisión:
“Aprobar y emitir recibo en Solana”
“Solicitar evidencia”
“Incidencia / Rechazar” (con motivo)
5) Reglas funcionales (deben verse en UI)
Unidad: KG (decimales).
Materiales fijos: Plástico, Vidrio, Papel y cartón, Metal, Electrónicos (RAEE).
EcoCoins: ecoCoins = floor(totalKg / 10).
Solo tras “KG verificados”:
se fijan ecoCoins finales
se emite recibo on-chain (aparece signature)
La verificación pública debe ser entendible: explicación corta + detalle técnico colapsable.
6) Frames nuevos a generar (agregar a tu set)
Detalle Completada (extendida): Ticket on-chain + Evidence Hash + QR + Explorer link
Página pública “Verificar recibo” (sin login)
Operador: Cola de revisión
Operador: Detalle de revisión
Estados: “Emitiendo en Solana”, “Pendiente on-chain”, “Error emisión”, “Analizando confianza”
7) Microcopy (editorial, directo)
“Recibo emitido en Solana (devnet) y verificable públicamente.”
“Transaction Signature”
“Evidencia anclada por hash para garantizar integridad.”
“Confianza baja: requiere revisión antes de emitir on-chain.”
“KG verificados: determinan ecoCoins finales.”