# Diseño — Invitación de usuarios por el administrador

Fecha: 2026-06-22
Estado: aprobado (pendiente de plan de implementación)
Rama: `feat/user-invitations`

## Problema

Hoy no existe forma de **invitar** usuarios. Solo hay dos caminos para dar de alta a alguien:

1. **Auto-registro público** (`/register` → `signUp`): cualquiera con el enlace crea su cuenta; el trigger `handle_new_user` le asigna el rol `viewer`.
2. **Gestión de roles** (`/app/users`, solo admin): el admin únicamente puede **cambiar el rol** de quien ya se registró por su cuenta.

Falta el eslabón habitual de una herramienta con roles: que el **admin dé de alta a alguien proactivamente** y, además, le asigne el rol con el que entra, sin depender de que la persona se registre sola y luego haya que ajustarla a mano.

## Decisiones (acordadas en brainstorming)

- **Modelo de acceso:** invitación **+** registro abierto. El auto-registro público (`/register`) se mantiene; la invitación es un atajo adicional para el admin. (No se cierra el registro.)
- **Rol al invitar:** el admin **elige el rol** (`viewer` / `researcher` / `admin`) en el formulario de invitación; la persona entra ya con ese rol.
- **Entrega:** **email automático** vía Supabase (`auth.admin.inviteUserByEmail`).
- **Enfoque:** Edge Function dedicada + página de aceptación (Enfoque A). Descartados: rol vía metadata + modificar el trigger `handle_new_user` (riesgo de escalada de privilegios, ya que `options.data` lo controla el cliente en el registro abierto); y reutilizar `Auth.tsx` para aceptar la invitación (mezcla responsabilidades, ese componente ya redirige al detectar sesión).

## Arquitectura y componentes

Cuatro piezas, cada una con una responsabilidad clara:

| Pieza | Tipo | Responsabilidad | Depende de |
|---|---|---|---|
| `supabase/functions/invite-user/index.ts` | Edge Function (nueva) | Valida que el llamante es `admin`, invita por email con `inviteUserByEmail`, y fija el rol elegido con `upsert` en `user_roles`. | `SUPABASE_SERVICE_ROLE_KEY`, patrón de `get-users-with-roles` |
| `src/components/InviteUserDialog.tsx` | Componente React (nuevo) | Formulario modal: email, nombre completo, selector de rol. Llama a la función e informa éxito/error. | `supabase.functions.invoke`, shadcn `Dialog` |
| `src/pages/UserManagement.tsx` | Página (modificada) | Añade botón **"Invitar usuario"** que abre el diálogo; refresca la lista al terminar. | `InviteUserDialog` |
| `src/pages/AcceptInvite.tsx` + ruta `/accept-invite` | Página (nueva) | Aterrizaje del enlace del email: detecta la sesión de invitación, pide y guarda la contraseña (`updateUser`), entra a `/app`. | `useAuthStore`, router |

El diálogo se separa de `UserManagement.tsx` en su propio archivo a propósito: esa página ya ronda las ~280 líneas; mantener el formulario aislado facilita razonarlo y testearlo.

### Contrato de la Edge Function `invite-user`

- **Entrada:** `POST { email: string, fullName: string, role: 'viewer'|'researcher'|'admin' }` + header `Authorization: Bearer <jwt>`.
- **Salida:**
  - `200 { success: true }` (opcionalmente `{ success: true, warning: '...' }` si el rol no pudo fijarse, ver más abajo)
  - `400` datos inválidos (email mal formado o rol fuera del enum)
  - `401` no autenticado (sin JWT o inválido)
  - `403` el llamante no es `admin`
  - `409` el email ya tiene cuenta
  - `500` fallo de invitación / envío de email

## Flujo de datos

### Flujo A · El admin invita (en `/app/users`)

1. Admin pulsa **"Invitar usuario"** → abre `InviteUserDialog`, rellena email + nombre + rol.
2. El diálogo llama `supabase.functions.invoke('invite-user', { body: { email, fullName, role } })`. El SDK adjunta el JWT del admin automáticamente.
3. La Edge Function:
   - a. Verifica el JWT (cliente anon → `getUser`) y que el rol del llamante en `user_roles` sea `admin`. Si no → `401`/`403`.
   - b. Valida `email` (formato) y `role` (∈ enum `app_role`). Si no → `400`.
   - c. `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo: '<SITE_URL>/accept-invite' })`. Crea el usuario en `auth.users` (sin confirmar) **y dispara el envío del email**. El trigger `handle_new_user` inserta su fila en `user_roles` como `viewer`.
   - d. Con el `id` devuelto, `upsert` en `user_roles` `{ user_id, role }` con el rol elegido (sobrescribe el `viewer` por defecto; el `service_role` salta RLS).
   - e. Devuelve `200`. Si el email ya existía, `inviteUserByEmail` falla → se mapea a `409`.
4. El diálogo muestra toast de éxito y refresca la lista (`fetchUsers`). El invitado aparece de inmediato con `last_sign_in_at: never` → señal natural de "pendiente" (no se añade badge nuevo; YAGNI).

### Flujo B · El invitado acepta (desde el email)

1. Pulsa el enlace → Supabase valida el token y redirige a `<SITE_URL>/accept-invite` estableciendo **sesión activa pero sin contraseña**.
2. `AcceptInvite.tsx` detecta la sesión (evento `SIGNED_IN` / `getSession`). Si no hay sesión de invitación válida → mensaje de enlace caducado/usado + enlace a `/login`.
3. Muestra formulario "Establece tu contraseña" (password + confirmar). Al enviar → `supabase.auth.updateUser({ password })`.
4. Éxito → el usuario queda confirmado y logueado con su rol ya asignado → redirige a `/app`.

### Dependencia de configuración (paso manual de Fernando)

En Lovable Cloud / Supabase Auth hay que **añadir `<SITE_URL>/accept-invite` a la allowlist de Redirect URLs** (tanto para el preview de Lovable como para producción), o el enlace del email será rechazado. Es análogo a aplicar migraciones en el SQL editor: queda fuera del código y debe hacerlo Fernando.

## Seguridad

- **Autorización doble server-side:** la función verifica (1) JWT válido y (2) rol `admin` leído de `user_roles` con el `service_role`. Nunca confía en el cliente. Idéntico al patrón de `get-users-with-roles`.
- **El `service_role` jamás sale del servidor:** solo en variables de entorno de la Edge Function; el navegador usa la `anon key`.
- **Rol fuera de metadata:** el rol se fija únicamente en `user_roles` (gobernada por RLS), no en `raw_user_meta_data`. Esto cierra la vía de escalada de privilegios que tendría el enfoque de "rol por metadata + trigger" (en el registro abierto, `options.data` lo controla el cliente). Separar identidad (auth) de autorización (`user_roles`) es lo que mantiene seguro el modelo.
- **CORS:** reutiliza las mismas cabeceras que las funciones existentes.

## Manejo de errores

| Situación | Respuesta función | Qué ve el admin |
|---|---|---|
| Sin sesión / JWT inválido | `401` | "Sesión expirada, vuelve a entrar" |
| Llamante no admin | `403` | "No tienes permisos" |
| Email mal formado o rol inválido | `400` | Validación en el propio formulario |
| Email ya registrado | `409` | "Ese email ya tiene cuenta" |
| Fallo de envío / SMTP / rate-limit | `500` | "No se pudo enviar la invitación, inténtalo de nuevo" |

- **Flujo B**, enlace caducado o ya usado → `AcceptInvite` muestra aviso + botón a `/login` (nunca pantalla en blanco).
- El `upsert` del rol (paso d) se envuelve en try/catch: si falla *después* de invitar, se registra en logs y se devuelve `200` con `warning`. El usuario existe como `viewer` y el admin puede corregir el rol a mano desde la misma página — evita dejar la invitación a medias.

### Nota sobre la *race* trigger vs upsert

Hay una pequeña carrera benigna entre el trigger `handle_new_user` (paso c, inserta `viewer`) y el `upsert` del rol real (paso d). Como ambos ocurren server-side y secuencialmente dentro de la función, el `upsert` siempre gana. Por eso `upsert` (la fila ya existe por el trigger) y no `insert`.

## Pruebas

Siguiendo el patrón del repo (Vitest + MSW; ya existe `inferenceWorker.test.ts`):

- **`InviteUserDialog.test.tsx`:** email vacío/inválido bloquea el envío; al enviar llama a `invoke('invite-user')` con el body correcto; muestra toast de éxito y de error (mock `409` → mensaje "ya existe").
- **`AcceptInvite.test.tsx`:** sin sesión → aviso de enlace caducado; con sesión → contraseñas que no coinciden bloquea; coincidentes → llama `updateUser({ password })` y navega a `/app`.
- **Edge Function `invite-user`:** test del guard de autorización (no-admin → `403`) y del mapeo de códigos de error. Si un test end-to-end de Deno resulta costoso, como mínimo cubrir unitariamente el guard de rol y el mapeo de errores.
- **Verificación manual (Fernando, en preview de Lovable):** allowlist de redirect URL aplicada → invitar un email real → recibir correo → establecer contraseña → entrar con el rol correcto. Imprescindible: el envío de email y la allowlist no los cubre ningún test unitario y son justo donde fallan las invitaciones en la práctica.

## Internacionalización

Añadir cadenas i18n (ES/EN, siguiendo la estructura existente) para: título y campos del diálogo de invitación, mensajes de éxito/error de cada código de respuesta, y la página `AcceptInvite` (título, campos de contraseña, aviso de enlace caducado).

## Fuera de alcance (YAGNI)

- Reenviar / revocar invitaciones pendientes.
- Badge explícito de "pendiente" (ya se infiere de `last_sign_in_at: never`).
- Invitaciones masivas / por CSV.
- Cerrar el registro público (decisión explícita: se mantiene abierto).

## Restricciones del repositorio (recordatorio para la implementación)

- Pre-commit hook rechaza contenido/mensaje que contenga cierta palabra reservada del asistente (evitarla en archivos y mensajes de commit).
- Firma GPG rota en sesiones de agente → commitear con `git -c commit.gpgsign=false commit`.
- Migraciones (si las hubiera) se aplican vía el SQL editor de Supabase/Lovable Cloud. *Este diseño no requiere migración nueva* — reutiliza `user_roles` y el trigger existentes.
- Fernando hace los `git push`; el agente nunca empuja.
