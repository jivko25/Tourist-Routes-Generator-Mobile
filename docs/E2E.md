# Travel Go — E2E tests (Maestro)

Мобилното e2e е с **[Maestro](https://maestro.dev/)**. Flows живеят в repo: `.maestro/*.yaml`.

**Backlog + testID каталог:** [`docs/E2E_FLOWS.md`](./E2E_FLOWS.md)  
**Правило:** при нов UI винаги слагай `testID` (`.cursor/rules/e2e-testids.mdc`).

## Как се пускат (препоръчително)

От корена на проекта, с emulator/device + инсталиран Travel Go APK:

```bash
npm run test:e2e:list      # какви shortcuts има
npm run test:e2e:smoke     # табове
npm run test:e2e:forms     # Settings → Login → Register
npm run test:e2e:invalid   # грешен login
npm run test:e2e           # цялата suite (без optional)
```

Login success (веднъж настройки credentials):

```bash
cp .maestro/auth.env.example .maestro/auth.env
# попълни E2E_EMAIL / E2E_PASSWORD в .maestro/auth.env

npm run test:e2e:login
```

Скриптът `scripts/e2e.js` сам намира Maestro CLI и зарежда `.maestro/auth.env` — **не копирай YAML в друго приложение**.

## Maestro Studio (само за визуален debug)

Studio **не** е задължителен за пускане на тестовете.

1. Open / New workspace → избери папката  
   `Tourist-Routes-Generator-Mobile/.maestro`  
   (съществуващите файлове, без copy-paste).
2. Select device → Run избран flow.

Ако Studio иска „нов файл“ и празен editor — грешиш workspace; сочи към `.maestro` от този repo.

## Какво е покрито

| Flow | Shortcut | Файл |
|------|----------|------|
| Smoke tabs | `smoke` | `.maestro/smoke_tabs.yaml` |
| Home search UI | `home` | `.maestro/home_search_ui.yaml` |
| Auth forms | `forms` | `.maestro/settings_auth_forms.yaml` |
| Invalid login | `invalid` | `.maestro/auth_login_invalid.yaml` |
| Login success | `login` | `.maestro/auth_login_success.yaml` (optional + `auth.env`) |

Auth flows ползват `.maestro/subflows/ensure_signed_out.yaml` (Sign out през UI), за да са идемпотентни без `pm clear`.

**Не са автоматизирани (още):** Google Drive OAuth, ZIP upload, камера/галерия, пълен Places search.

## Инсталация на Maestro CLI (веднъж)

Git Bash:

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

`npm run test:e2e*` не изисква PATH — ползва `%USERPROFILE%\.maestro\bin`.

## APK

```bash
npm run build:android
# или: npm run build:e2e:android
```

Инсталирай APK на emulator/device преди тестовете.

## EAS cloud (CI)

```bash
npm run test:e2e:cloud
```

## testID конвенция

- Екрани: `screen-home`, `screen-settings`, `screen-login`, …
- Табове: `tab-HomeTab`, `tab-MapTab`, …
- Действия: `settings-sign-in`, `login-submit`, `search-input`, …

Maestro: `id: 'settings-sign-in'`
