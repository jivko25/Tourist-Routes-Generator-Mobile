# Live trip (#9) — тестване с реални точки

## Какво е имплементирано

На екрана **Your Route**:
- **Start trip** — иска location (+ по желание Always/background) и notification permission
- Геофенс (~120 m) около **следващата** спирка + foreground GPS watch
- При пристигане → local push → tap отваря детайл на мястото
- `recordPlaceVisit` → Visited map
- **Stop trip**

## Реален GPS тест

1. Добави в маршрута място **близо до теб** (или седнеш в кафене до туристическа точка).
2. **Your Route** → **Start trip** → разреши локация (и нотификации; по желание Always).
3. Приближи се в радиус ~120 m.
4. Очаквай push „Arrived / You’re at …“, прогрес, смяна на следващата спирка.
5. Tap на нотификацията (или **Open [place]**) → детайл екран.
6. Провери **Map** tab → мястото да е отбелязано (ако градът съдържа държава, напр. `Paris, France`).

## Mock / fake GPS (по избор)

### Android
- Developer options → **Select mock location app** (напр. “Fake GPS”).
- Задай координатите на следващата спирка от детайл екрана / Maps.
- Със Start trip + mock pin вътре в 120 m → Enter geofence.

### iOS Simulator
- Features → Location → Custom Location (координати на спирката).

> Пълен background geofencing е най-надежден на **preview/EAS APK**, не в Expo Go. Foreground watch работи и в dev.

## Permissions checklist

- Foreground location: задължително
- Background / Always: за arrivals докато си в Google Maps
- Notifications: за push при пристигане

Ако background е отказан, UI показва предупреждение — foreground watch пак работи докато приложението е отворено.

## testIDs

- `live-trip-panel`
- `live-trip-start`
- `live-trip-stop`
- `live-trip-next-stop`
- `live-trip-open-arrival`

След native rebuild тези ID-та влизат в APK за Maestro.
