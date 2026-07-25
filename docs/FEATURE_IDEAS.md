# Travel Go — идеи за функционалности

Приоритизиран backlog. Работим **едно по едно** (отгоре надолу).
Маркирай с `[x]`, когато е готово.

## Backlog

- [x] **1. Време на място** — ориентировъчно „45 мин“ / „2 ч“ за всяка спирка (по тип място)
- [x] **2. Отвори сега** — цветни маркери на маршрута + работно време в детайли (филтер в списъка — по желание по-късно)
- [x] **3. Сподели маршрут** — линк и/или PDF/снимка за приятел
- [x] **4. Първа и последна спирка** — reverse на маршрута (+ START/END badges по реда)
- [x] **5. GPS старт/край** — начало и край от текуща локация (син пин)
- [x] **6. Офлайн маршрут** — запазени данни достъпни без интернет
- [x] **7. Партньорски билети** — GetYourGuide / подобни (внимателно с ToS и disclosure)
- [x] **8. По-добри снимки** — смяна/подобрение на източника (сегашните free covers не са най-качествени)
- [ ] **9. Live проследяване на маршрут** — „Start trip“; background location докато потребителят ползва Maps; при пристигане → push; от нотификацията → детайл за мястото → следваща точка
- [x] **10. AI travel chat** — parse intent (Vercel) + GYG activities; hotels/car stubs (flights — за премахване, виж #13)
- [ ] **11. Visited map (страни/места)** — SVG карта на света; оцветяване на посетени държави; при клик — списък къде/кога съм бил в тази страна (хранене от #9)
  - [x] Базов екран + SVG map (`@svg-maps/world`) + pan/zoom + sheet
  - [x] Локални visits в AsyncStorage + Mark as visited / Clear
  - [x] Curved bottom tab (AI FAB + Explore / Saved / Map / Settings)
  - [x] Top cities от `GET /api/countries/:code` → tap → Attractions (без geocode)
  - [x] Visit schema: `kind: country | city | place` (+ placeId, coords, routeId) — готов за live trip
  - [ ] UI: mark city visited + badge в списъка с градове
  - [ ] Автоматично `recordPlaceVisit` при arrival на спирка (#9)
- [ ] **12. Booking.com affiliate в чата** — хотели през партньорски линкове (като GYG за activities), с disclosure
- [ ] **13. Премахване на полети от чата** — няма ясен flight affiliate; махни transport/flights от parse UI, orchestrator stubs и placeholder copy
- [ ] **14. Clarifying questions в AI чата (бекенд)** — slot-filling: ако липсват критични данни, питай преди orchestration (не „познавай“)
- [ ] **15. Разумен throttling на AI / API** — лимити на заявки (per device / IP / ден), за да не се изчерпи безплатният лимит на LLM и свързаните API-та

## Продуктова връзка (#9 + #11)

Цикъл: **активен маршрут → посещение → спомен на картата**.

1. Потребителят стартира маршрут в приложението.
2. В background се следи локацията (геофенс около **следващата** точка; battery-friendly, не непрекъснат GPS stream).
3. При пристигане → push: „Пристигна на [място]“.
4. Отваряне на push → повече информация за текущото място → продължаване към следващата точка по същия начин.
5. Локално се записва visit:
   - `kind: 'place'` за забележителността (placeId, placeName, coords, routeId)
   - при нужда и `kind: 'city'` за града
   - държавата се оцветява от всеки visit с този `countryCode`
6. На visited картата: държава → градове (visited badge) → места в града.

Етапи (препоръчително):
1. Visit schema (готово) + ръчен mark city
2. Arrival detection → `recordPlaceVisit`
3. Push + place detail deep link
4. Map UI: country / city / place drill-down

## Бележки

- #7: GetYourGuide deep links с `partner_id` + disclosure; без scraping на цени. Place search: tickets / skip-the-line / tours / activities.
- #6: AsyncStorage + NetInfo — преглед на saved routes офлайн; нови търсения/Maps directions изискват интернет. Пълни offline map tiles не са част от Google Maps SDK в Expo.
- #3: системен Share sheet с Google Maps directions URL (Route + Saved).
- #8: текущо **Pexels API** (search, няколко снимки/място + attribution). Без Places Photo SKU.
- #9: `expo-location` geofencing / background location + `expo-notifications`. При arrival викай `recordPlaceVisit({ countryCode, cityName, placeId, placeName, lat/lng, routeId, source: 'trip' })`. Нужни: foreground+background permission, radius ~80–150 m, debounce 30–60 сек, дедуп per `placeId`. Deep link от нотификацията към place detail. **Wikipedia extract** вече се зарежда в detail (`wikipediaStory.extract`, ~2–3 мин четене) — готов вход за TTS при пристигане.
- #11: Visit log е единен store с `kind: country | city | place`. Картата оцветява по countryCode; sheet → градове; град → places. Helpers: `markCountryVisited`, `markCityVisited`, `recordPlaceVisit`, `isCityVisited`.
  - Имплементирано: map UI + countries API + schema.
  - Остава: city badge UI; auto place visits от #9.
- #12: Booking.com partner links в hotel branch на orchestrator-а (заместване на hotel placeholder), аналогично на GYG. Disclosure задължителен.
- #13: махни `transport` / flights от chat UX и stubs; остави activities (GYG) + hotels (Booking #12) + евентуално car_rental ако има affiliate по-късно.
- #14: бекенд `/api/travel/parse` (или follow-up endpoint) връща `needs_clarification` + 1–3 въпроса; клиентът merge-ва отговорите в същия intent.
  - **Критични (спри и питай):** дестинация; дати или „от–до“ / начална дата + брой дни; брой души (за Booking/цени).
  - **Важни, неблокиращи:** бюджет; интереси (музеи, food…); темпо (relaxed / packed).
  - UX: макс. 2–3 въпроса на ход, групирани („Кога пътувате и колко души сте?“), не анкета.
- #15: throttle на parse/chat endpoint — напр. N заявки / минута и дневен cap per device id (или anon token) + IP; ясен UX при лимит („Опитай пак по-късно“). По желание: по-кратък prompt / евтин модел за clarification-only стъпки. Цел: да останем в безплатния/евтиния tier колкото се може по-дълго.

## История

| Дата | Функция | Статус |
|------|---------|--------|
| 2026-07-21 | #1 Време на място | Готово — heuristic по тип; pill в картите/детайл |
| 2026-07-21 | #1+ Общо време на маршрут | Готово — visit + travel (Routes API) = total |
| 2026-07-21 | #4 Reverse route | Готово — Reverse обръща реда; START/END са първа/последна |
| 2026-07-21 | #2 Open now | Готово — зелен/жълт/червен на картата; hours в Details |
| 2026-07-21 | #5 GPS старт/край | Готово — Start/End from my location; син пин за Me |
| 2026-07-21 | #6 Офлайн маршрут | Готово — преглед на saved; блок на нови търсения; graceful RouteScreen |
| 2026-07-22 | #3 Сподели маршрут | Готово — Share Google Maps link (Route + Saved) |
| 2026-07-22 | #8+#9 backlog | Добавени — photos upgrade + live trip geofence pushes |
| 2026-07-23 | #8 По-добри снимки | Готово — Pexels API, галерия с няколко снимки + attribution |
| 2026-07-23 | #7 Партньорски билети | Готово — GetYourGuide affiliate deep links + disclosure |
| 2026-07-24 | #10 AI travel chat | Готово — parse API + orchestrator; GYG activities; Chat tab |
| 2026-07-25 | #9 разширено | Live tracking + push + visit log; връзка с #11 |
| 2026-07-25 | #11+#12+#13 | Visited map; Booking.com в чата; премахване на полети |
| 2026-07-25 | #14+#15 | Clarifying slot-fill в чата; throttling за free-tier лимити |
| 2026-07-25 | #11 visit schema | kind country/city/place + recordPlaceVisit за #9 |
| 2026-07-25 | i18n EN/BG | i18next + Settings language; Places/Geocoding languageCode |
| 2026-07-25 | Wikipedia story | Detail preview + sheet; cached extract for future TTS |
