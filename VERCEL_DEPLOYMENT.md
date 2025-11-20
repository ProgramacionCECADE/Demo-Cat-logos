# Despliegue en Vercel

Este documento explica cómo desplegar la aplicación en Vercel.

## Configuración Inicial

### 1. Instalar Vercel CLI (opcional, para testing local)

```bash
npm i -g vercel
```

### 2. Configurar Variables de Entorno en Vercel

La aplicación requiere la variable de entorno `ADMIN_TOKEN_HASH` para funcionar correctamente.

#### Generar el hash del token
Ejecuta el script para generar un token aleatorio y su hash:

```bash
node scripts/generate-admin-token.js
```

Esto mostrará:
- **Token**: Guárdalo de forma segura, lo necesitarás para acceder al panel de administrador
- **Hash bcrypt**: Este es el valor que debes configurar en Vercel

#### Configurar en Vercel Dashboard

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Agrega la variable:
   - **Name**: `ADMIN_TOKEN_HASH`
   - **Value**: El hash bcrypt generado
   - **Environments**: Production, Preview, Development (selecciona todos)
4. Haz clic en "Save"

### 3. Desplegar

#### Opción A: Deploy desde Git (Recomendado)

1. Conecta tu repositorio Git en el Vercel Dashboard
2. Vercel detectará automáticamente la configuración desde `vercel.json`
3. Cada push a la rama principal desplegará automáticamente

#### Opción B: Deploy Manual con CLI

```bash
# Desde el directorio del proyecto
vercel

# O para producción directamente
vercel --prod
```

## Probar Localmente con Vercel CLI

Para probar las funciones serverless localmente antes de desplegar:

```bash
vercel dev
```

Esto iniciará un servidor local que emula el entorno de Vercel.

## Estructura de Archivos

```
/api
  /_lib              # Utilidades compartidas
    auth.js          # Autenticación y cookies
    cors.js          # Manejo de CORS
    storage.js       # Almacenamiento de descuentos
  catalog.js         # GET /api/catalog
  discounts.js       # GET/POST /api/discounts
  verify.js          # POST /api/verify
  /products
    [id].js          # GET /api/products/:id
/public              # Archivos estáticos
vercel.json          # Configuración de Vercel
```

## Notas Importantes

### Almacenamiento de Descuentos

⚠️ **Importante**: Las funciones serverless de Vercel usan `/tmp` para almacenamiento temporal. Este almacenamiento:
- **No es persistente** entre deployments
- **No es compartido** entre diferentes instancias de funciones
- Se borra periódicamente

Para producción, considera usar:
- Una base de datos (Vercel KV, PostgreSQL, MongoDB, etc.)
- Un servicio de almacenamiento externo (S3, etc.)

### Rutas Reescritas

El archivo `vercel.json` incluye un rewrite de `/admin/verify` → `/api/verify` para mantener compatibilidad con el código cliente existente.

## Verificar el Despliegue

Después de desplegar, prueba:

1. **Página principal**: `https://tu-dominio.vercel.app/`
2. **API de descuentos**: `https://tu-dominio.vercel.app/api/discounts`
3. **Panel admin**: Usa la secuencia secreta o `Ctrl+Shift+A` para abrir el panel

## Desarrollo Local vs Producción

### Desarrollo Local
- Usa `npm run dev` (servidor Express con nodemon)
- El servidor Express en `server/server.js` maneja todas las rutas
- Los datos se guardan en `server/discounts.json`

### Producción en Vercel
- Usa funciones serverless en `/api`
- Cada endpoint es una función independiente
- Los datos se guardan en `/tmp` (temporal)

Ambos entornos son compatibles - puedes desarrollar localmente con Express y desplegar en Vercel sin conflictos.
