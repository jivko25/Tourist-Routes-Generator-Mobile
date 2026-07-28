# Travel Go — E2E flow backlog (Maestro)

Цел: след **един** preview/e2e APK build да могат да се пишат нови Maestro YAML flows **без** нов native build — всички ключови UI елементи вече имат `testID`.

Как се пускат тестове: [`docs/E2E.md`](./E2E.md)  
Правило за нови UI: `.cursor/rules/e2e-testids.mdc`

---

## Status на съществуващи flows

| Flow | Файл | Status |
|------|------|--------|
| Smoke tabs | `.maestro/smoke_tabs.yaml` | [x] Done |
| Home search UI | `.maestro/home_search_ui.yaml` | [x] Done |
| Settings auth forms | `.maestro/settings_auth_forms.yaml` | [x] Done |
| Invalid login | `.maestro/auth_login_invalid.yaml` | [x] Done |
| Login success | `.maestro/auth_login_success.yaml` | [x] Done (optional + `auth.env`) |

---

## TODO — flows за писане (без rebuild)

Маркирай с `[x]` когато има YAML + минава локално.

### Explore / Places

- [ ] **City search → attractions list**  
  `search-input` → `search-submit` → `screen-attractions` → поне един `attraction-card-*`
- [ ] **Add place to route from list**  
  `attraction-add-*` → `attractions-footer-route` → `screen-route` → `selected-place-*`
- [ ] **Attraction details**  
  `attraction-details-*` → `screen-attraction-detail` → `detail-add-route` / `detail-remove-route` → `detail-open-maps` (optional)
- [ ] **List \| Map toggle**  
  `attractions-view-map` → `attractions-map` → tap marker → `attraction-map-preview` → `attraction-map-preview-toggle` / `attraction-map-preview-details`
- [ ] **Places options (sort / categories)**  
  `attractions-options` → `places-options-sheet` → `places-sort-*` → `places-options-done`
- [ ] **Reload catalog after resume**  
  Seed route offline → reopen app → `active-route-continue` → `route-add-more` → auto load / `attractions-reload` → list not empty

### Route

- [ ] **Continue active route from Home**  
  `active-route-card` → `active-route-continue` → `screen-route`
- [ ] **Clear active route**  
  `active-route-clear` (confirm dialog — text-based assert)
- [ ] **Add more places**  
  `route-add-more` → `screen-attractions`
- [ ] **Live trip start → arrival → detail**  
  `live-trip-start` → (real geofence / GPS) → notification / `live-trip-open-arrival` → `screen-attraction-detail`
- [ ] **Reverse / optimize / GPS**  
  `route-reverse`, `route-optimize` (dock), `route-gps-start`, `route-gps-end`
- [ ] **Open in Google Maps**  
  `route-open-maps` (may leave app — soft assert / optional tag)
- [ ] **Share route**  
  `route-share` (system sheet — optional)
- [ ] **Save route → Saved tab**  
  `route-save` → `route-save-name` → `route-save-confirm` → `tab-SavedTab` → `saved-route-*`
- [ ] **Clear route from dock**  
  `route-clear`

### Saved

- [ ] **Open saved route**  
  `saved-route-open-*` → `screen-route`
- [ ] **Share / delete saved**  
  `saved-route-share-*`, `saved-route-delete-*`

### Visited map (#11)

- [ ] **Open map tab**  
  `tab-MapTab` → `screen-map` → `map-canvas`
- [ ] **Country sheet**  
  (tap country — may need coords/text) → `map-country-sheet` → `map-mark-visited` / `map-clear-visits`
- [ ] **City → Attractions / Photos**  
  `map-city-attractions-*` → `screen-attractions`  
  `map-city-photos-*` → `screen-city-photos`

### Photos / Exports (#17 / #19)

- [ ] **City photos add**  
  `city-photos-add` (gallery/camera — device permission; optional / manual)
- [ ] **Export ZIP → Drive**  
  `city-photos-export` (needs login + Drive OAuth — optional, flaky)
- [ ] **Exports list**  
  `settings-my-exports` → `screen-photo-exports` → `photo-export-*` / `photo-export-open-*` / `photo-export-delete-*`

### Auth / Settings

- [ ] **Register form validation**  
  `settings-create-account` → `screen-register` → empty submit disabled; invalid email
- [ ] **Sign out**  
  after login → `settings-sign-out` → `settings-sign-in` visible
- [ ] **Settings save**  
  `settings-start-address` / `settings-language-en` / `settings-save`
- [ ] **Offline banner**  
  airplane mode → `offline-banner` on Home / Route (optional device toggle)

### AI chat

- [ ] **Send chat message**  
  `tab-ChatTab` → `screen-chat` → `chat-input` → `chat-send` → `chat-messages` (network / rate-limit sensitive — optional)

### Smoke extensions

- [ ] **Deep smoke: Home → search → add → route → save** (happy path, tagged `smoke`)
- [ ] **Deep smoke: Settings account gate** (signed out vs signed in)

---

## testID catalog (stable selectors)

### Tabs
`tab-HomeTab`, `tab-SavedTab`, `tab-ChatTab`, `tab-MapTab`, `tab-SettingsTab`

### Screens
`screen-home`, `screen-attractions`, `screen-attraction-detail`, `screen-route`, `screen-saved`, `screen-chat`, `screen-map`, `screen-settings`, `screen-login`, `screen-register`, `screen-city-photos`, `screen-photo-exports`

### Home / search
`home-brand`, `home-open-settings`, `search-bar`, `search-input`, `search-submit`, `category-*`, `active-route-card`, `active-route-continue`, `active-route-clear`, `offline-banner`

### Attractions
`attractions-search`, `attractions-options`, `attractions-view-list`, `attractions-view-map`, `attractions-footer-route`, `attractions-reload`, `attractions-map`, `attractions-map-empty`, `attraction-card-*`, `attraction-add-*`, `attraction-details-*`, `attraction-map-preview`, `attraction-map-preview-close`, `attraction-map-preview-details`, `attraction-map-preview-toggle`, `places-options-sheet`, `places-sort-*`, `places-options-done`

### Detail
`detail-add-route`, `detail-remove-route`, `detail-open-maps`

### Route
`route-add-more`, `route-gps-start`, `route-gps-end`, `route-reverse`, `route-actions-dock`, `route-actions-toggle`, `route-open-maps`, `route-share`, `route-save`, `route-optimize`, `route-optimize-expanded`, `route-clear`, `route-save-name`, `route-save-cancel`, `route-save-confirm`, `selected-place-*`, `selected-place-remove-*`, `live-trip-panel`, `live-trip-start`, `live-trip-stop`, `live-trip-next-stop`, `live-trip-open-arrival`

### Saved
`saved-title`, `saved-route-*`, `saved-route-open-*`, `saved-route-share-*`, `saved-route-delete-*`

### Map / country sheet
`map-title`, `map-canvas`, `map-country-sheet`, `map-country-sheet-close`, `map-mark-visited`, `map-clear-visits`, `map-cities-retry`, `map-city-attractions-*`, `map-city-photos-*`, `map-places-see-more`, `map-place-visit-*`

### Photos / exports
`city-photos-add`, `city-photos-export`, `photo-export-*`, `photo-export-open-*`, `photo-export-delete-*`

### Auth / settings
`settings-account-section`, `settings-sign-in`, `settings-create-account`, `settings-sign-out`, `settings-user-email`, `settings-my-exports`, `settings-language`, `settings-language-en`, `settings-language-bg`, `settings-travel-mode`, `settings-travel-mode-more`, `settings-radius-presets`, `settings-radius-presets-more`, `settings-radius-custom`, `settings-start-address`, `settings-end-address`, `settings-save`, `login-*`, `register-*` (`register-go-login`)

### Chat
`chat-messages`, `chat-input`, `chat-send`

---

## Бележки

- Динамичните IDs ползват Places / route / export entity id — в Maestro често `id: "attraction-add-.*"` с regex, или първо `tapOn` по текст, после assert по screen.
- OAuth, камера, Maps deep link и AI са **optional** / flaky — tag `optional`.
- Нови UI промени: добавяй `testID` веднага (виж Cursor rule) и нова точка тук ако е нов user journey.
