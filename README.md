# CareThiq

**DE** | [EN](#english)

---

## Deutsch

CareThiq ist eine mobile Healthcare-Management-App für die ambulante und stationäre Pflege. Sie verbindet Pflegekräfte, Patienten und Gelegenheitsnutzer über eine gemeinsame Plattform mit rollenbasiertem Zugriff.

### Funktionen

**Pflegekraft**
- Patientenverwaltung mit Adresse, Geburtsdatum und Zimmer
- Medikamentenverwaltung mit Wirkstoff-Autocomplete (RxNorm API)
- GPS-Annäherungserkennung — automatische Benachrichtigung bei Patientennähe
- Vitalwerte erfassen (Blutdruck, Puls, Gewicht)
- Verhaltens-Tags pro Besuch
- Pflegebericht pro Besuch
- Statistik-Screen mit Wohlbefinden-, Vital- und Verhaltensverlauf (48h)

**Patient**
- Tagesübersicht der Medikamente
- Einnahme bestätigen mit Wohlbefindens-Abfrage
- Freistehende Wohlbefindens-Eingabe per Smiley-Skala
- Notfall-Button mit direktem Notruf (112)

**Casual (ohne Account)**
- Lokale Medikamentenverwaltung ohne Server
- Export und Import der Daten

### Technologie

| Bereich | Stack |
|---|---|
| Backend | Python · Flask · SQLAlchemy · Flask-JWT-Extended · Docker |
| Datenbank | SQLite (dev) |
| Frontend | React Native · Expo · TypeScript |
| APIs | RxNorm (Medikamente) · Nominatim/OpenStreetMap (Adressen) |

### Setup Backend

Voraussetzungen: Docker Desktop

```bash
cd backend
docker-compose up --build
```

Backend läuft auf `http://localhost:5000`

**Demo-Users anlegen** (einzeln in PowerShell):

```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Maria Hoffmann","email":"maria@carethiq.de","password":"test123","role":"caregiver"}'

Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Sarah Müller","email":"sarah@carethiq.de","password":"test123","role":"patient"}'

Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Gast","email":"guest@carethiq.de","password":"test123","role":"casual"}'
```

**DB zurücksetzen:**

```powershell
docker-compose down
Remove-Item "instance\careThiq.db" -Force
docker-compose up --build
```

### Setup App

Voraussetzungen: Node.js · Expo Go auf dem Gerät

```bash
cd app
npm install
npx expo start
```

IP-Adresse anpassen in `src/services/api.ts` und `src/context/AuthContext.tsx`:

```typescript
const API_BASE = 'http://DEINE_IP:5000/api';
```

---

<a name="english"></a>
## English

CareThiq is a mobile healthcare management app for outpatient and inpatient care. It connects caregivers, patients, and casual users through a shared platform with role-based access.

### Features

**Caregiver**
- Patient management with address, date of birth, and room
- Medication management with active ingredient autocomplete (RxNorm API)
- GPS proximity detection — automatic notification when near a patient
- Record vital signs (blood pressure, pulse, weight)
- Behavior tags per visit
- Care report per visit
- Statistics screen with wellbeing, vitals, and behavior history (48h)

**Patient**
- Daily medication overview
- Confirm intake with wellbeing check
- Standalone wellbeing entry via smiley scale
- Emergency button with direct emergency call (112)

**Casual (no account required)**
- Local medication management without a server
- Export and import of data

### Tech Stack

| Layer | Stack |
|---|---|
| Backend | Python · Flask · SQLAlchemy · Flask-JWT-Extended · Docker |
| Database | SQLite (dev) |
| Frontend | React Native · Expo · TypeScript |
| APIs | RxNorm (medications) · Nominatim/OpenStreetMap (addresses) |

### Backend Setup

Requirements: Docker Desktop

```bash
cd backend
docker-compose up --build
```

Backend runs on `http://localhost:5000`

**Create demo users** (one by one in PowerShell):

```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Maria Hoffmann","email":"maria@carethiq.de","password":"test123","role":"caregiver"}'

Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Sarah Müller","email":"sarah@carethiq.de","password":"test123","role":"patient"}'

Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"name":"Gast","email":"guest@carethiq.de","password":"test123","role":"casual"}'
```

**Reset database:**

```powershell
docker-compose down
Remove-Item "instance\careThiq.db" -Force
docker-compose up --build
```

### App Setup

Requirements: Node.js · Expo Go on your device

```bash
cd app
npm install
npx expo start
```

Update the IP address in `src/services/api.ts` and `src/context/AuthContext.tsx`:

```typescript
const API_BASE = 'http://YOUR_IP:5000/api';
```

---

*Entwickelt von Gordon Overend · elektrohirn · 2026*  
*Developed by Gordon Overend · elektrohirn · 2026*
