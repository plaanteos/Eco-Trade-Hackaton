# Sistema de Autenticación - EcoTrade

## 🔐 Inicio de Sesión

La aplicación ahora requiere autenticación para acceder. Existen **2 roles diferenciados**:

---

## 👤 ROL: USUARIO NORMAL

**¿Qué puede hacer?**
- Crear sesiones de reciclaje
- Gestionar su historial de entregas
- Ver sus ecoCoins acumulados
- Consultar el estado de sus sesiones
- Ver recibos blockchain verificables

**Credenciales de Prueba:**
```
Email: maria@example.com
Password: usuario
```

**Flujo:**
1. Ingresa a la aplicación → Verás la pantalla de login
2. Haz clic en el card "Usuario"
3. Las credenciales se pre-llenan automáticamente (o ingrésalas manualmente)
4. Haz clic en "Ingresar"
5. Serás redirigido al **Dashboard de Usuario** con:
   - Botón "Crear Sesión"
   - Estadísticas de ecoCoins ganados
   - Historial de entregas
   - Actividad reciente

**Navegación:**
- **Inicio**: Dashboard principal con estadísticas
- **Historial**: Todas tus sesiones de reciclaje
- **Perfil** (esquina superior derecha): Ver nombre y cerrar sesión

---

## 👨‍💼 ROL: OPERADOR

**¿Qué puede hacer?**
- Ver y gestionar la cola de revisión
- Verificar kilogramos de materiales
- Aprobar sesiones y emitir recibos on-chain (Solana)
- Solicitar evidencia adicional
- Marcar incidencias o rechazar entregas
- Ver todas las sesiones del sistema

**Credenciales de Prueba:**
```
Email: juan@example.com
Password: operador
```

**Flujo:**
1. Ingresa a la aplicación → Verás la pantalla de login
2. Haz clic en el card "Operador"
3. Las credenciales se pre-llenan automáticamente (o ingrésalas manualmente)
4. Haz clic en "Ingresar"
5. Serás redirigido automáticamente a la **Cola de Revisión** con:
   - Sesiones pendientes de verificación
   - Filtros por confianza, KG alto, sin evidencia, etc.
   - Estadísticas de sesiones en revisión

**Navegación:**
- **Cola de Revisión**: Dashboard principal del operador
- **Todas las Sesiones**: Historial completo del sistema
- **Perfil** (esquina superior derecha): Ver nombre y cerrar sesión

**Acciones disponibles en revisión:**
1. **Aprobar y Emitir en Solana**: Verifica KG, genera recibo blockchain
2. **Solicitar Evidencia**: Pide más fotos o información
3. **Incidencia / Rechazar**: Marca problemas o rechaza la entrega

---

## 🔄 Cambiar de Rol

Para cambiar de rol durante las pruebas:
1. Haz clic en el botón de **Logout** (icono de salida en esquina superior derecha)
2. Serás redirigido a la pantalla de login
3. Selecciona el otro rol

---

## 🎨 Diferencias Visuales por Rol

### Usuario Normal
- Color principal: **Verde botella** (#2D5016)
- Icono: Usuario (User)
- Navegación: Inicio, Historial
- Dashboard enfocado en ecoCoins y creación de sesiones

### Operador
- Color principal: **Naranja** (#B85C00)
- Icono: Maletín (Briefcase)
- Navegación: Cola de Revisión, Todas las Sesiones
- Dashboard enfocado en pendientes y verificaciones

---

## 📊 Datos de Prueba

La aplicación incluye **sesiones mock** con diferentes estados:

1. **Sesión 000184** - Completada con recibo Solana
2. **Sesión 000185** - Programada con RAEE (requiere revisión)
3. **Sesión 000186** - En curso
4. **Sesión 000183** - Cancelada
5. **Sesión 000187** - **Pendiente de verificación** (score bajo, perfecto para probar flujo de operador)

---

## 🔗 Persistencia

- El **estado de autenticación** se guarda en `localStorage`
- Si recargas la página, permanecerás autenticado
- La sesión persiste hasta que hagas **logout**

---

## 🧪 Flujo Completo de Prueba

### Como Usuario:
1. Login como Usuario
2. Crear nueva sesión de reciclaje
3. Ver historial
4. Consultar recibo blockchain de sesión completada

### Como Operador:
1. Login como Operador
2. Ver cola de revisión (sesión 000187 estará pendiente)
3. Hacer clic en "Revisar" en la sesión pendiente
4. Ajustar KG verificados
5. Agregar nota del operador
6. Aprobar y "emitir" en Solana (simulado)
7. Ver la sesión completada con recibo blockchain

---

## 🚀 Inicio Rápido

```
Usuario Normal:
- Email: maria@example.com
- Password: usuario
→ Dashboard de Usuario → Crear Sesión

Operador:
- Email: juan@example.com  
- Password: operador
→ Cola de Revisión → Revisar Sesión 000187
```

---

## 📝 Notas

- Las contraseñas son simples para facilitar las pruebas
- El sistema es completamente funcional en frontend
- Los "mock users" están definidos en `/src/app/context/AuthContext.tsx`
- Las rutas están protegidas: sin autenticación = redirect a /login
- La página de verificación pública (`/verificar/:id`) NO requiere login
