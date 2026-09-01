# PJS Soft — generator ofert

Aplikacja desktopowa dla Windows do prowadzenia katalogu produktów, budowania
ofert handlowych i eksportowania ich do PDF dla klienta.

## Funkcje

- **Produkty** — katalog produktów (nazwa, tytuł/wariant, opakowanie, min. ilość
  sprzedaży, cena netto, zdjęcie) z pełnym CRUD.
- **Oferty** — wybór produktów z katalogu, zmiana kolejności, **cena i ilość
  ustalane osobno dla każdej oferty** (cena katalogowa pozostaje nienaruszona).
- **Szablony** — edytor wyglądu PDF z bezpośrednią manipulacją. Elementy
  ustawia się **przeciągając je na podglądzie strony**:
  - niebieskie linie marginesów (osobno dla każdej strony, co do 0,5 mm),
  - uchwyt zmiany rozmiaru zdjęcia produktu i logo,
  - przeciąganie linii tekstu w bloku produktu, by zmienić ich kolejność,
  - krawędzie kolumn w układzie tabelarycznym.

  Każdą wartość można też wpisać dokładnie w panelu po lewej: marginesy
  per strona, odstępy, wypełnienia, rozmiar/pozycja/dopasowanie zdjęcia,
  liczba kolumn siatki, obramowania i zaokrąglenia, a dla **każdej linii
  tekstu osobno** rozmiar, grubość, kolor, wyrównanie, wersaliki, odstęp
  i przedrostek (np. „Cena netto: ”). Kliknięcie elementu na podglądzie
  otwiera jego sekcję ustawień.
- **Dane firmy** — logo i dane kontaktowe drukowane w nagłówku oferty.
- **Podgląd i eksport PDF** — podgląd jest generowany tą samą ścieżką co plik
  końcowy, więc nie może się od niego różnić.

Program działa w pełni offline; dane są przechowywane lokalnie w plikach JSON.

## Wymagania

Node.js 20+ i npm (tylko do budowania). Gotowa aplikacja nie wymaga niczego
poza Windows 10/11 64-bit.

## Uruchamianie

```bash
npm install
npm run dev          # tryb deweloperski
npm run typecheck    # sprawdzenie typów (main + renderer)
npm run build        # zbudowanie bundli do out/
npm run build:win    # instalator + wersja portable do dist/
```

`npm run build:win` tworzy:

- `dist/PJS-Soft-Setup.exe` — instalator (skrót na pulpicie i w menu Start)
- `dist/PJS-Soft-1.0.0-win-x64-portable.exe` — wersja bez instalacji

## Pobieranie

Najnowsza wersja jest zawsze pod stałym adresem:

**<https://github.com/AwoKode/pjs-soft/releases/latest/download/PJS-Soft-Setup.exe>**

Wszystkie wydania (w tym wersja portable): <https://github.com/AwoKode/pjs-soft/releases>

Pliki nie są podpisane cyfrowo, więc przy pierwszym uruchomieniu Windows
SmartScreen pokaże ostrzeżenie — należy wybrać *Więcej informacji → Uruchom mimo to*.

## Aktualizacje

Program sam sprawdza aktualizacje kilka sekund po uruchomieniu i pobiera je
w tle. Pobierana jest **tylko różnica** między wersjami (kilka MB, nie 109 MB) —
odpowiada za to plik `.blockmap` obok instalatora. Gdy aktualizacja jest gotowa,
u góry okna pojawia się pasek z przyciskiem *Uruchom ponownie i zainstaluj*;
instalacja nigdy nie odbywa się bez kliknięcia użytkownika. To samo można zrobić
ręcznie w zakładce **Ustawienia → O programie**.

Dane w folderze danych nie są przy tym ruszane — leżą poza katalogiem instalacji.

Dwa zastrzeżenia:

- **Wersja portable nie aktualizuje się sama.** Automatyczne aktualizacje działają
  wyłącznie w wersji z instalatorem.
- Brak połączenia z internetem nie jest błędem — program działa offline,
  a nieudane sprawdzenie aktualizacji jest tylko komunikatem w Ustawieniach.

### Wydanie nowej wersji

1. Zmień `version` w `package.json` (np. na `1.0.1`) i zatwierdź zmiany.
2. `git tag v1.0.1 && git push origin master --tags`

GitHub Actions (`.github/workflows/release.yml`) zbuduje wersję na Windows,
sprawdzi typy i opublikuje wydanie wraz z plikami `latest.yml` i `.blockmap`,
których potrzebuje mechanizm aktualizacji. Lokalne `npm run build:win` niczego
nie publikuje.

## Gdzie są dane

Domyślnie `%APPDATA%\pjs-soft\dane`:

```
dane\
  products.json     katalog produktów
  offers.json       oferty
  templates.json    szablony PDF
  company.json      dane firmy
  products\         zdjęcia produktów
  logo\             logo firmy
  backups\          automatyczne kopie 10 ostatnich zapisów
```

Skopiowanie folderu `dane` to pełna kopia zapasowa. Lokalizację można zmienić
w zakładce **Ustawienia** (np. na folder OneDrive), z opcją przeniesienia
istniejących danych.

## Architektura

```
src/
  main/       proces główny Electrona — baza plikowa, obrazy, generowanie PDF
  preload/    most contextBridge (window.api), bez nodeIntegration
  renderer/   interfejs React + TypeScript
  shared/     typy, formatowanie i renderer HTML używany po obu stronach
```

Kluczowa decyzja: `src/shared/render/` zamienia ofertę, szablon i dane firmy w
dokument HTML, a proces główny drukuje ten sam dokument przez
`webContents.printToPDF` zarówno dla podglądu, jak i dla eksportu. Dzięki temu
podgląd i plik wynikowy nie mogą się rozjechać.

Ten sam renderer ma dwa tryby. `mode: 'print'` produkuje dokument do
`printToPDF` (marginesy ustawia drukarka, więc trafiają na każdą stronę).
`mode: 'canvas'` dokłada do tego samego HTML uchwyty i skrypt przeciągania
(`src/shared/render/canvas.ts`) — to jest edytor szablonów. W trakcie
przeciągania skrypt zmienia styl lokalnie w iframe i dopiero po puszczeniu
przycisku wysyła gotową wartość do aplikacji; gdyby raportował każdy ruch,
przerysowanie podglądu przerywałoby gest.

Zakładka **Podgląd PDF** w edytorze szablonów pokazuje prawdziwy, podzielony
na strony plik — bo w PDF nie da się niczego przeciągnąć.
