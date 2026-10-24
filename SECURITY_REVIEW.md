# Revisión de seguridad — 2026-10-24

Repositorio: `JulianKizeno/lab-nodemailer`. Rama: `security/review-2026-10-24`.

## Correcciones

- CWE-321: replace the public session signing secret and harden cookies
- CWE-943: reject object/array credentials and bound bcrypt inputs
- CWE-338/CWE-532/CWE-79: cryptographic confirmation tokens, no credential logs or HTML email injection
- Update vulnerable dependencies: mongoose ^6.13.12, bcrypt ^6.0.0, passport ^0.7.0, nodemailer ^10.2.1, Replace LibSass/node-sass with Dart Sass

## Auditoría npm después de los cambios

| Proyecto | Críticas | Altas | Moderadas | Bajas | Total |
|---|---:|---:|---:|---:|---:|
| `.` | 0 | 0 | 0 | 0 | 0 |

## Verificación

- Pruebas de regresión de seguridad (`security-tests`): correctas.
- Inicialización de servidor (`.`) con APIs reales de las dependencias y conexión de base de datos aislada: correcta.

## Límites y configuración

- La auditoría cubre el árbol npm resuelto, no demuestra ausencia de vulnerabilidades de lógica, infraestructura o servicios externos. No se ha desplegado ni fusionado este cambio.
- Configurar un SESSION_SECRET nuevo de al menos 32 caracteres. En producción las cookies requieren HTTPS; revisar la configuración del proxy de confianza para la topología real.
- SCSS se compila al iniciar el servidor; reiniciar tras modificar estilos. Eliminar LibSass evita su árbol obsoleto de dependencias nativas.
