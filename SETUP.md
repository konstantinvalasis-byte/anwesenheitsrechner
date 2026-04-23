# 🚀 Setup-Anleitung – Anwesenheitsrechner

## Schritt 1: Supabase SQL-Schema einspielen

1. Gehe auf [supabase.com/dashboard](https://supabase.com/dashboard) → dein Projekt
2. Linke Sidebar: **SQL Editor** → **New query**
3. Kopiere den gesamten Inhalt aus `supabase-schema.sql` und führe ihn aus (**Run**)
4. ✅ Alle Tabellen und Funktionen werden erstellt

## Schritt 2: E-Mail-Bestätigung deaktivieren (optional, für schnelles Testen)

1. In Supabase: **Authentication → Providers → Email**
2. **"Confirm email"** ausschalten → Save
3. So können Teammitglieder sich direkt ohne E-Mail-Bestätigung anmelden

## Schritt 3: App starten

```powershell
cd C:\Users\Dino\Websites\Anwesenheitsrechner
npm run dev
```

→ App öffnet sich unter http://localhost:5173/

## Schritt 4: Ersten Admin erstellen

1. Registriere dich mit deiner E-Mail in der App
2. Gehe in Supabase: **Table Editor → profiles**
3. Suche deinen Eintrag → Setze `is_admin = TRUE`
4. Oder führe im SQL Editor aus:
   ```sql
   UPDATE profiles SET is_admin = TRUE WHERE name = 'Dein Name';
   ```

## Schritt 5: Team einladen

- Teile die URL mit deinen Teammitgliedern (nach Deployment)
- Jeder registriert sich selbst mit E-Mail + Passwort
- Jeder trägt seine eigenen Tage ein

## Deployment (kostenlos auf Netlify)

```powershell
npm run build
# Dann den "dist" Ordner auf netlify.com hochladen (Drag & Drop)
```

---

## Funktionsübersicht

| Feature | Details |
|---|---|
| **Login/Register** | E-Mail + Passwort via Supabase Auth |
| **Dashboard** | Persönliche Anwesenheitsquote mit Progress-Ring |
| **Kalender** | Monatlicher Kalender, BW-Feiertage automatisch |
| **Team-Übersicht** | Anonyme Teamstatistik (kein Name sichtbar) |
| **Admin-Panel** | Alle Mitglieder mit vollen Daten + CSV-Export |
| **Berechnung** | 50% der Netto-Arbeitstage (nach Abzug Urlaub/Krank/etc.) |
| **BW-Feiertage** | Vollständig automatisch inkl. beweglicher Feiertage |

## Tagestypen

| Typ | Zählt als Präsenz | Verringert Pflicht |
|---|---|---|
| 🏢 Büro | ✅ Ja | ❌ Nein |
| 🏠 Mobil | ❌ Nein | ❌ Nein |
| 🌴 Urlaub | ❌ Nein | ✅ Ja |
| 🎉 Feiertag | ❌ Nein | ✅ Ja |
| ⏰ Gleittag | ❌ Nein | ✅ Ja |
| 🤒 Krank | ❌ Nein | ✅ Ja |
