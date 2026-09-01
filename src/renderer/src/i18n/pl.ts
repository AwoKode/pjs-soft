/**
 * Every user-visible string lives here. The app ships in Polish only, but
 * keeping the strings in one table means adding a second language later is a
 * matter of adding a sibling file rather than combing through components.
 */
export const pl = {
  app: {
    name: 'PJS Soft',
    tagline: 'Generator ofert'
  },
  nav: {
    products: 'Produkty',
    offers: 'Oferty',
    templates: 'Szablony',
    company: 'Dane firmy',
    settings: 'Ustawienia'
  },
  common: {
    add: 'Dodaj',
    save: 'Zapisz',
    saved: 'Zapisano',
    cancel: 'Anuluj',
    close: 'Zamknij',
    delete: 'Usuń',
    edit: 'Edytuj',
    duplicate: 'Duplikuj',
    search: 'Szukaj...',
    back: 'Wróć',
    yes: 'Tak',
    no: 'Nie',
    none: 'brak',
    loading: 'Wczytywanie...',
    required: 'Pole wymagane',
    invalidNumber: 'Podaj poprawną liczbę',
    unknownError: 'Wystąpił nieoczekiwany błąd.'
  },
  products: {
    title: 'Produkty',
    new: 'Nowy produkt',
    edit: 'Edycja produktu',
    count: (n: number) => `${n} ${plural(n, 'pozycja', 'pozycje', 'pozycji')}`,
    emptyTitle: 'Brak produktów',
    emptyHint: 'Dodaj pierwszy produkt, aby móc budować z niego oferty.',
    noResults: 'Żaden produkt nie pasuje do wyszukiwania.',
    fields: {
      name: 'Nazwa',
      title: 'Tytuł / wariant',
      titleHint: 'np. 567g, 150ml, Soft',
      packaging: 'Opakowanie',
      packagingHint: 'np. 4 szt / karton',
      minSellQuantity: 'Min. ilość sprzedaży',
      price: 'Cena netto (PLN)',
      image: 'Zdjęcie'
    },
    deleteTitle: 'Usunąć produkt?',
    deleteBody: (name: string) => `Produkt „${name}” zostanie trwale usunięty.`,
    deleteUsage: 'Produkt jest używany w tych ofertach i zostanie z nich usunięty:'
  },
  offers: {
    title: 'Oferty',
    new: 'Nowa oferta',
    count: (n: number) => `${n} ${plural(n, 'oferta', 'oferty', 'ofert')}`,
    emptyTitle: 'Brak ofert',
    emptyHint: 'Utwórz ofertę, wybierz produkty i wyeksportuj PDF dla klienta.',
    columns: {
      number: 'Numer',
      title: 'Tytuł',
      customer: 'Klient',
      date: 'Data',
      items: 'Pozycje'
    },
    fields: {
      number: 'Numer oferty',
      title: 'Tytuł oferty',
      customer: 'Klient',
      date: 'Data',
      validUntil: 'Ważna do',
      template: 'Szablon',
      notes: 'Uwagi (drukowane w PDF)'
    },
    catalogue: 'Katalog produktów',
    lines: (n: number) => `Pozycje w ofercie (${n})`,
    addSelected: 'Dodaj do oferty',
    noLines: 'Oferta jest pusta. Wybierz produkty z katalogu po lewej stronie.',
    allAdded: 'Wszystkie produkty są już w ofercie.',
    catalogPrice: 'katalog',
    offerPrice: 'Cena w ofercie',
    quantity: 'Ilość',
    resetPrice: 'Przywróć cenę katalogową',
    remove: 'Usuń z oferty',
    reorderHint: 'Przeciągnij ⠿, aby zmienić kolejność.',
    tabEdit: 'Edycja',
    tabPreview: 'Podgląd',
    exportPdf: 'Eksportuj PDF',
    exporting: 'Generowanie PDF...',
    exported: 'Zapisano PDF',
    openPdf: 'Otwórz',
    deleteTitle: 'Usunąć ofertę?',
    deleteBody: (name: string) => `Oferta „${name}” zostanie trwale usunięta.`
  },
  templates: {
    title: 'Szablony',
    new: 'Nowy szablon',
    builtIn: 'wbudowany',
    builtInNote:
      'To szablon wbudowany — tylko do odczytu. Kliknij „Duplikuj”, aby stworzyć własną wersję, którą możesz dowolnie zmieniać.',
    layout: 'Układ',
    layouts: { row: 'Wiersz', grid2: 'Siatka', table: 'Tabela' },
    modeCanvas: 'Edytor',
    modePdf: 'Podgląd PDF',
    canvasHint:
      'Przeciągnij niebieskie linie marginesu, uchwyt zdjęcia lub logo, przesuń linie tekstu w bloku produktu, a w tabeli — krawędzie kolumn. Kliknij element, aby otworzyć jego ustawienia.',
    fieldsHint:
      'Kolejność na liście = kolejność wydruku. Możesz też przeciągać linie bezpośrednio w edytorze.',
    tableHint: 'Szerokości kolumn możesz też ustawiać przeciągając ich krawędzie w edytorze.',
    groups: {
      page: 'Strona, czcionka i kolory',
      header: 'Nagłówek i logo',
      image: 'Zdjęcie produktu',
      fields: 'Linie w bloku produktu',
      product: 'Blok produktu i odstępy',
      table: 'Tabela — kolumny',
      cover: 'Strona tytułowa',
      terms: 'Warunki handlowe',
      footer: 'Stopka'
    },
    fields: {
      name: 'Nazwa szablonu',
      orientation: 'Orientacja',
      portrait: 'Pionowa',
      landscape: 'Pozioma',
      margin: 'Marginesy strony',
      accent: 'Kolor akcentu',
      text: 'Kolor tekstu',
      muted: 'Kolor tekstu pomocniczego',
      background: 'Tło strony',
      fontFamily: 'Czcionka',
      fontSize: 'Bazowy rozmiar tekstu',
      showImage: 'Pokaż zdjęcie',
      imageWidth: 'Szerokość zdjęcia',
      imageHeight: 'Wysokość zdjęcia',
      imagePosition: 'Położenie',
      posLeft: 'Z lewej',
      posRight: 'Z prawej',
      posTop: 'Nad tekstem',
      imageFit: 'Dopasowanie',
      fitContain: 'Całe w ramce',
      fitCover: 'Wypełnij ramkę',
      imageGap: 'Odstęp od tekstu',
      imageRadius: 'Zaokrąglenie',
      prefix: 'Przedrostek, np. „Cena netto: ”',
      productGap: 'Odstęp między produktami',
      productPadding: 'Wypełnienie bloku',
      columns: 'Liczba kolumn',
      divider: 'Linia między produktami',
      dividerWidth: 'Grubość linii',
      dividerColor: 'Kolor linii',
      cardBorder: 'Obramowanie bloku',
      cardBorderColor: 'Kolor obramowania',
      cardRadius: 'Zaokrąglenie rogów',
      cardBackground: 'Tło bloku',
      rowPadding: 'Wysokość wiersza',
      zebra: 'Naprzemienne tło wierszy',
      tableHeaderBg: 'Tło nagłówka tabeli',
      tableHeaderColor: 'Tekst nagłówka tabeli',
      tableBorder: 'Kolor linii tabeli',
      headerVisible: 'Pokaż nagłówek',
      showLogo: 'Pokaż logo',
      logoWidth: 'Szerokość logo',
      logoAlign: 'Położenie logo',
      showCompany: 'Pokaż dane firmy',
      headerTitleVisible: 'Pokaż tytuł',
      headerTitle: 'Tytuł w nagłówku',
      headerDivider: 'Linia pod nagłówkiem',
      headerSpaceBelow: 'Odstęp pod nagłówkiem',
      coverEnabled: 'Włącz stronę tytułową',
      coverTitle: 'Tytuł',
      coverSubtitle: 'Podtytuł',
      coverJustify: 'Położenie w pionie',
      justifyStart: 'Do góry',
      justifyCenter: 'Na środku',
      justifyEnd: 'Do dołu',
      coverLogoWidth: 'Szerokość logo',
      termsEnabled: 'Pokaż warunki handlowe',
      termsTitle: 'Nagłówek sekcji',
      termsText: 'Treść warunków',
      termsSpaceAbove: 'Odstęp nad sekcją',
      footerText: 'Tekst stopki',
      pageNumbers: 'Numeracja stron'
    },
    placeholders: 'Możesz użyć: {{numerOferty}}, {{data}}, {{waznaDo}}, {{klient}}, {{firma}}',
    deleteTitle: 'Usunąć szablon?',
    deleteBody: (name: string) => `Szablon „${name}” zostanie trwale usunięty.`,
    sampleNote: 'Dane przykładowe'
  },
  company: {
    title: 'Dane firmy',
    intro: 'Te dane pojawiają się w nagłówku generowanych ofert.',
    fields: {
      name: 'Nazwa firmy',
      address: 'Adres',
      nip: 'NIP',
      phone: 'Telefon',
      email: 'E-mail',
      www: 'Strona WWW',
      bankAccount: 'Numer konta',
      logo: 'Logo'
    }
  },
  settings: {
    title: 'Ustawienia',
    dataDir: 'Folder danych',
    dataDirHint:
      'Tutaj przechowywane są produkty, oferty, szablony i zdjęcia. Skopiuj ten folder, aby zrobić kopię zapasową.',
    change: 'Zmień folder...',
    openFolder: 'Otwórz w Eksploratorze',
    restartNote: 'Folder danych został zmieniony.',
    about: 'O programie'
  },
  updates: {
    version: 'Wersja',
    check: 'Sprawdź aktualizacje',
    checking: 'Sprawdzanie aktualizacji...',
    upToDate: 'Masz najnowszą wersję.',
    available: (version: string): string => `Znaleziono wersję ${version} — pobieranie...`,
    downloading: (percent: number): string => `Pobieranie aktualizacji: ${percent}%`,
    ready: (version: string): string =>
      `Wersja ${version} jest gotowa do zainstalowania.`,
    install: 'Uruchom ponownie i zainstaluj',
    error: 'Nie udało się sprawdzić aktualizacji (brak połączenia?).',
    // Wersja portable nie potrafi się zaktualizować — instalator tak.
    portableNote: 'Automatyczne aktualizacje działają tylko w wersji z instalatorem.'
  },
  image: {
    choose: 'Kliknij, aby wybrać plik',
    dropHint: 'lub przeciągnij obraz tutaj',
    change: 'Zmień',
    remove: 'Usuń zdjęcie',
    noImage: 'Brak zdjęcia'
  }
}

/** Polish plural selection: 1 / 2-4 / 5+ with the usual teen exceptions. */
function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  if (abs === 1) return one
  const lastTwo = abs % 100
  const last = abs % 10
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few
  return many
}

export type Strings = typeof pl
