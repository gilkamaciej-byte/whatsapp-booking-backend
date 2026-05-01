# WhatsApp Booking Backend - aktualny kontekst projektu

Data aktualizacji: 2026-05-01

Ten plik opisuje aktualny stan projektu, zeby mozna bylo latwo kontynuowac prace w nowym oknie rozmowy z Codex/ChatGPT.

## Lokalizacja projektu

Projekt znajduje sie lokalnie tutaj:

```text
G:\Whatsappbackend\whatsapp-booking-api
```

Repo GitHub:

```text
https://github.com/gilkamaciej-byte/whatsapp-booking-backend
```

## Stack

- Node.js
- TypeScript
- Express
- Twilio WhatsApp webhook
- Prisma
- PostgreSQL lokalnie przez Docker
- Prisma Studio do podgladu bazy
- ngrok do testowania webhooka z Twilio

## Co juz dziala

Backend odbiera wiadomosci WhatsApp przez webhook Twilio:

```text
POST /webhooks/twilio/whatsapp
```

Test end-to-end zostal potwierdzony:

```text
WhatsApp -> Twilio -> ngrok -> Express backend -> odpowiedz TwiML -> WhatsApp
```

Webhook odpowiada uzytkownikowi, prowadzi prosty flow rezerwacji i zapisuje dane do PostgreSQL.

## Multi-client foundation

Projekt nie jest obecnie panelem SaaS. Klientow/biznesy konfigurujemy recznie w bazie.

Model `Business` ma pole:

```prisma
phoneNumber String @unique
```

Backend rozpoznaje biznes po numerze, na ktory przyszla wiadomosc:

```ts
req.body.To
```

Webhook robi lookup:

```ts
prisma.business.findUnique({
  where: {
    phoneNumber: to,
  },
});
```

To oznacza:

- kazdy biznes musi miec unikalny numer WhatsApp/Twilio w `Business.phoneNumber`,
- dla Twilio Sandbox numer to zwykle `whatsapp:+14155238886`,
- przez jeden sandbox da sie realnie testowac tylko jeden biznes naraz,
- drugi biznes mozna testowac lokalnym requestem, ustawiajac inne `To`.

## Aktualny flow rozmowy

Uzytkownik pisze:

```text
wizyta
```

Backend odpowiada lista uslug z bazy.

Nastepnie uzytkownik wybiera usluge:

```text
1
```

albo nazwa uslugi, np.:

```text
strzyzenie
```

Nastepnie uzytkownik podaje termin:

```text
jutro 15:00
```

Backend prosi o potwierdzenie.

Uzytkownik odpisuje:

```text
tak
```

Backend tworzy rekord `Appointment`.

Reset rozmowy:

```text
reset
```

## Conversation store

Stan rozmowy nie jest juz trzymany w RAM.

Zostal przeniesiony do PostgreSQL, model:

```prisma
model Conversation {
  id            String   @id @default(uuid())
  businessId    String
  customerPhone String
  step          String
  serviceName   String?
  dateText      String?
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())

  business Business @relation(fields: [businessId], references: [id])

  @@unique([businessId, customerPhone])
}
```

Conversation jest identyfikowana po:

```text
businessId + customerPhone
```

Dzieki temu ten sam numer klienta moze pisac do roznych biznesow bez mieszania stanow rozmowy.

## Najwazniejsze modele Prisma

```prisma
model Business {
  id          String   @id @default(uuid())
  name        String
  phoneNumber String   @unique
  timezone    String   @default("Europe/Warsaw")
  createdAt   DateTime @default(now())

  services      Service[]
  customers     Customer[]
  appointments  Appointment[]
  conversations Conversation[]
}
```

```prisma
model Service {
  id              String @id @default(uuid())
  businessId      String
  name            String
  durationMinutes Int

  business     Business      @relation(fields: [businessId], references: [id])
  appointments Appointment[]

  @@unique([businessId, name])
}
```

```prisma
model Customer {
  id         String @id @default(uuid())
  businessId String
  phone      String

  business     Business      @relation(fields: [businessId], references: [id])
  appointments Appointment[]

  @@unique([businessId, phone])
}
```

```prisma
model Appointment {
  id         String @id @default(uuid())
  businessId String
  customerId String
  serviceId  String

  startTime DateTime
  endTime   DateTime

  business Business @relation(fields: [businessId], references: [id])
  customer Customer @relation(fields: [customerId], references: [id])
  service  Service  @relation(fields: [serviceId], references: [id])
}
```

## Seed

Seed jest idempotentny: mozna go odpalac wiele razy.

Tworzy/aktualizuje biznes:

```text
name: Test Barber
phoneNumber: whatsapp:+14155238886
timezone: Europe/Warsaw
```

Tworzy/aktualizuje uslugi:

```text
broda - 20 min
strzyzenie - 30 min
strzyzenie + broda - 45 min
```

Seed bierze numer biznesu z:

```text
SEED_BUSINESS_PHONE_NUMBER
```

albo:

```text
TWILIO_WHATSAPP_NUMBER
```

albo domyslnie:

```text
whatsapp:+14155238886
```

Komenda:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npx ts-node-dev --transpile-only src/db/seed.ts
```

## Uruchamianie lokalnie

Backend:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npm run dev
```

Prisma Studio:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npx prisma studio
```

Adres Prisma Studio:

```text
http://localhost:5555
```

Synchronizacja bazy:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npx prisma db push
```

Generowanie Prisma Client:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npx prisma generate
```

Sprawdzenie TypeScript:

```powershell
cd G:\Whatsappbackend\whatsapp-booking-api
npx tsc --noEmit
```

## Test lokalny webhooka bez WhatsApp

Backend musi dzialac na `localhost:3000`.

Start rozmowy:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri http://localhost:3000/webhooks/twilio/whatsapp `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:%2B48500111222&To=whatsapp:%2B14155238886&Body=wizyta"
```

Wybor uslugi:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri http://localhost:3000/webhooks/twilio/whatsapp `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:%2B48500111222&To=whatsapp:%2B14155238886&Body=2"
```

Podanie terminu:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri http://localhost:3000/webhooks/twilio/whatsapp `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:%2B48500111222&To=whatsapp:%2B14155238886&Body=jutro%2015%3A00"
```

Potwierdzenie:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri http://localhost:3000/webhooks/twilio/whatsapp `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:%2B48500111222&To=whatsapp:%2B14155238886&Body=tak"
```

Po potwierdzeniu powinien powstac rekord w tabeli `Appointment`.

## Test przez prawdziwy WhatsApp/Twilio

Backend musi dzialac lokalnie:

```powershell
npm run dev
```

ngrok:

```powershell
ngrok http 3000
```

W Twilio Sandbox ustaw webhook:

```text
https://TWOJ-NGROK-URL.ngrok-free.app/webhooks/twilio/whatsapp
```

Metoda:

```text
POST
```

Wazne: po restarcie ngrok URL zwykle sie zmienia i trzeba go ponownie wkleic w Twilio.

## Dodawanie nowego biznesu recznie

W Prisma Studio:

1. Dodaj rekord w `Business`.
2. Ustaw `name`.
3. Ustaw unikalny `phoneNumber`, np.:

```text
whatsapp:+48111222333
```

4. Dodaj rekordy w `Service` z `businessId` tego biznesu.

Pole `Service.id` zostaw puste. Prisma/PostgreSQL nada UUID automatycznie po zapisaniu.

## Skad brac numery dla klientow

Aktualne opcje:

- do testow lokalnych mozna uzywac dowolnych wartosci `To` w `Invoke-WebRequest`,
- przez Twilio Sandbox realnie testuje sie jeden numer sandboxa,
- dla prawdziwego multi-client potrzebne beda osobne numery WhatsApp/Twilio albo inny model identyfikacji klienta,
- kupno/aktywacja numerow WhatsApp w Twilio moze wymagac konfiguracji WhatsApp Business/Meta.

## Znane uwagi

1. Prisma Studio/Node moze blokowac plik:

```text
node_modules\.prisma\client\query_engine-windows.dll.node
```

Gdy `npx prisma generate` daje `EPERM`, trzeba zamknac:

- `npm run dev`,
- Prisma Studio,
- procesy Node,
- czasem VS Code.

2. Twilio nie dojdzie do `localhost`.

Do testu WhatsApp potrzebny jest publiczny HTTPS URL, np. ngrok.

3. `Business.phoneNumber` musi dokladnie pasowac do `req.body.To`.

Dla sandboxa:

```text
whatsapp:+14155238886
```

4. W bazie moze byc testowa usluga `Strzyzenie`/`StrzyÅ¼enie` dodana recznie. Jesli przeszkadza, usunac ja w Prisma Studio.

## Aktualne nastepne kroki

Najblizszy logiczny etap:

1. Ustalic, skad beda brane numery WhatsApp/Twilio dla klientow.
2. Przetestowac drugi `Business`.
3. Dodac blokade konfliktow wizyt.
4. Dodac dostepnosc godzin pracy.
5. Dodac dni wolne / reczne blokady terminow.
6. Pozniej ewentualnie dodac OpenAI/ChatGPT do bardziej naturalnych rozmow.

## Status na koniec ostatniej sesji

Potwierdzone:

- seed dziala,
- baza jest zsynchronizowana,
- Prisma Client generuje sie poprawnie,
- TypeScript przechodzi,
- webhook dziala lokalnie,
- webhook dziala przez Twilio/ngrok/WhatsApp,
- rozmowy sa zapisywane w PostgreSQL,
- appointment tworzy sie po potwierdzeniu rozmowy.

## Google Calendar - plan testowego podlaczenia

Integracja zostala przygotowana w wariancie service account. Sekrety Google trzymamy w `.env`, a ID kalendarza mozna ustawic globalnie przez `GOOGLE_CALENDAR_ID` albo per biznes w bazie w polu `Business.googleCalendarId`.

Wymagane kroki testowe:
1. W Google Cloud utworzyc projekt albo uzyc istniejacego.
2. Wlaczyc Google Calendar API.
3. Utworzyc Service Account i wygenerowac JSON key.
4. Skopiowac `client_email` do `GOOGLE_CALENDAR_CLIENT_EMAIL`.
5. Skopiowac `private_key` do `GOOGLE_CALENDAR_PRIVATE_KEY`, zachowujac znaki `\n`.
6. Utworzyc testowy kalendarz Google i udostepnic go emailowi service account z uprawnieniem do edycji wydarzen.
7. Skopiowac Calendar ID do `.env` jako `GOOGLE_CALENDAR_ID` albo zapisac go w bazie jako `Business.googleCalendarId`.
8. Odpalic PostgreSQL/Docker, potem `npx prisma db push` i `npx prisma generate`.
9. Uruchomic backend `npm run dev` i przejsc flow WhatsApp/webhook do potwierdzenia wizyty.
10. Po potwierdzeniu powinien powstac rekord `Appointment` oraz wydarzenie w Google Calendar; w bazie `Appointment.googleCalendarEventId` powinno miec ID eventu.

Uwaga: do testu z prywatnym kalendarzem Google wystarczy udostepnic konkretny kalendarz emailowi service account. OAuth dla wlascicieli biznesow bedzie potrzebny dopiero pozniej, gdy klient sam ma laczyc swoje konto Google przez panel.

## Google Calendar - status service account

Uzytkownik utworzyl service account w Google Cloud i pobral plik JSON z kluczem. Plik zostal umieszczony lokalnie w folderze calendar. Trzeba pilnowac, zeby nie trafil do Gita; `.gitignore` zostal rozszerzony o typowe nazwy kluczy JSON service account. Backend aktualnie czyta dane Google z `.env`: `GOOGLE_CALENDAR_CLIENT_EMAIL`, `GOOGLE_CALENDAR_PRIVATE_KEY`, opcjonalnie `GOOGLE_CALENDAR_ID`.

Nastepny krok: utworzyc testowy kalendarz w Google Calendar, udostepnic go emailowi z `client_email` service account z uprawnieniem do edycji wydarzen, skopiowac Calendar ID do `.env`, a potem zsynchronizowac baze i przetestowac flow rezerwacji.

## Google Calendar - aktualny krok

Uzytkownik ma juz dane z pliku JSON service account i wie, ze `private_key` w `.env` ma zostac z tekstowymi znakami `\n`. Nastepny etap to upewnic sie, ze testowy kalendarz Google jest udostepniony emailowi `client_email`, wpisac `GOOGLE_CALENDAR_ID` do `.env`, uruchomic PostgreSQL, wykonac `npx prisma db push`, `npx prisma generate`, a nastepnie przetestowac utworzenie wizyty przez webhook.

## Decyzja architektoniczna - Google Calendar MVP

Na etapie MVP wybieramy model centralnie zarzadzany: jeden biznesowy email Google po stronie operatora systemu, a dla kazdego klienta osobny kalendarz Google Calendar. Przyklad: 100 klientow = 100 osobnych kalendarzy na biznesowym koncie Google.

Projekt Google Cloud nie przechowuje kalendarzy. Projekt daje tylko Google Calendar API, service account i klucz dla backendu. Same kalendarze istnieja w Google Calendar na biznesowym koncie operatora.

Model docelowy dla MVP:
- jeden Google Cloud project,
- wlaczone Google Calendar API,
- jeden service account uzywany przez backend,
- jeden biznesowy email Google jako wlasciciel/administrator kalendarzy klientow,
- jeden kalendarz Google Calendar per klient/biznes,
- `Business.googleCalendarId` wskazuje kalendarz danego klienta,
- backend wybiera biznes po numerze WhatsApp/Twilio (`Business.phoneNumber`), a nastepnie tworzy event w kalendarzu z `Business.googleCalendarId`.

Onboarding klienta w tym modelu:
1. Operator tworzy na swoim biznesowym koncie Google nowy kalendarz, np. `[CLIENT] Nazwa Firmy - Rezerwacje`.
2. Operator udostepnia ten kalendarz service accountowi backendu z uprawnieniem do edycji wydarzen.
3. Operator opcjonalnie udostepnia kalendarz klientowi do podgladu albo edycji.
4. Operator kopiuje Calendar ID.
5. Operator zapisuje Calendar ID w bazie w `Business.googleCalendarId`.

Powody tej decyzji:
- najprostsze dla klienta, bo klient nie musi konfigurowac Google Cloud ani OAuth,
- operator zachowuje centralny dostep do kalendarzy, co pasuje do subskrypcji z ciaglym supportem,
- mozna szybko onboardowac pierwszych klientow recznie,
- OAuth mozna dodac pozniej, gdy powstanie panel klienta i potrzeba samodzielnego laczenia kont Google.

Ryzyka / kiedy rozwazyc migracje na OAuth:
- przy duzej liczbie klientow reczne zarzadzanie kalendarzami i dostepami bedzie coraz bardziej uciazliwe,
- przy bardzo duzej liczbie eventow moze pojawic sie potrzeba lepszego zarzadzania quota/rate limitami,
- jesli klient ma formalnie posiadac kalendarz na swoim koncie, potrzebny bedzie OAuth.

Praktyczna granica: model centralny jest OK na MVP i early product, nawet okolo 100 klientow, o ile ruch nie jest ekstremalny i operator chce utrzymywac support. Docelowy SaaS samoobslugowy powinien przejsc na OAuth.

## Google Calendar - test end-to-end potwierdzony

Data testu: 2026-05-01.

Przetestowano lokalny flow webhooka Twilio/WhatsApp na backendzie `localhost:3000`:
1. `reset` dla `From=whatsapp:+48500999001`,
2. `wizyta`,
3. wybor uslugi `1` (`broda`),
4. termin `jutro 16:30`,
5. potwierdzenie `tak`.

Wynik: backend utworzyl rekord `Appointment` i zapisal `googleCalendarEventId`, co potwierdza, ze wydarzenie zostalo utworzone w Google Calendar przez service account.

Dane testowego rekordu:
- customer: `whatsapp:+48500999001`,
- service: `broda`,
- startTime: `2026-05-01T14:30:00.000Z`,
- endTime: `2026-05-01T14:50:00.000Z`,
- googleCalendarEventId: `9p76q736msp8s90hjoriv0anks`.

Uwaga: `Business.googleCalendarId` bylo `null`, wiec backend uzyl globalnego fallbacku z `.env`: `GOOGLE_CALENDAR_ID`. Dla klientow w MVP docelowo wpisujemy osobny Calendar ID w `Business.googleCalendarId`.

## Poprawka parsera dat - niemiecki

Wykryto bug: `chrono-node` lapal godzine z tekstu typu `jutro 16:30`, ale ignorowal slowo relatywne i zapisywal termin na dzisiaj. Dla rynku niemieckiego poprawiono parser w `src/utils/parseDate.ts`, zeby przed fallbackiem na chrono obslugiwal relatywne slowa z godzina:
- `heute HH:mm` / `heute HH.mm` = dzisiaj,
- `morgen HH:mm` / `morgen HH.mm` = jutro,
- `übermorgen HH:mm` oraz `uebermorgen HH.mm` = pojutrze.

Zostawiono tez podstawowa obsluge polskich odpowiednikow (`dzisiaj`, `dzis`, `dziœ`, `jutro`, `pojutrze`), bo byly uzywane w testach.

Wazna poprawka techniczna: dluzsze slowa sa sprawdzane przed krotszymi, zeby `übermorgen` nie zostalo przypadkiem zinterpretowane jako `morgen`.

Test parsera:
- `heute 16:30` -> `2026-05-01T14:30:00.000Z`,
- `morgen 16:30` -> `2026-05-02T14:30:00.000Z`,
- `übermorgen 16:30` -> `2026-05-03T14:30:00.000Z`.

Test webhooka po poprawce:
- customer: `whatsapp:+48500999002`,
- service: `broda`,
- input dateText: `morgen 16:30`,
- startTime: `2026-05-02T14:30:00.000Z`,
- endTime: `2026-05-02T14:50:00.000Z`,
- googleCalendarEventId: `238aggj01pgl92b2rcgv4p4n0s`.

Wniosek: niemieckie `morgen 16:30` zapisuje sie poprawnie jako nastepny dzien i tworzy wydarzenie Google Calendar.

## Blokada konfliktow wizyt - MVP

Dodano blokade podwojnych rezerwacji na poziomie calego biznesu. Przed utworzeniem `Appointment` backend sprawdza, czy istnieje juz wizyta tego samego `businessId`, ktora nachodzi na nowy przedzial czasu:
`existing.startTime < newEndTime AND existing.endTime > newStartTime`.

Jesli konflikt istnieje, `createAppointment` rzuca `AppointmentConflictError`, a webhook odpowiada uzytkownikowi, ze termin jest zajety. Rozmowa wraca do kroku `CHOOSING_DATE`, wiec klient moze podac inna godzine bez wybierania uslugi od nowa.

Dodano tez `AppointmentDateParseError`, zeby webhook mogl ladnie poprosic o ponowne podanie terminu, gdy parser nie rozumie daty.

Test konfliktu:
- istniala juz wizyta `broda` na `morgen 16:30`, czyli `2026-05-02T14:30:00.000Z`,
- nowy klient `whatsapp:+48500999003` probowal zarezerwowac `morgen 16:30`,
- backend odpowiedzial: `Ten termin jest juz zajety. Podaj inna godzine dla uslugi: broda.`,
- po podaniu `morgen 17:00` backend zapisal wizyte i utworzyl event Google Calendar.

Nowy poprawny rekord testowy:
- customer: `whatsapp:+48500999003`,
- service: `broda`,
- startTime: `2026-05-02T15:00:00.000Z`,
- endTime: `2026-05-02T15:20:00.000Z`,
- googleCalendarEventId: `n67d39abebvik69bgklfsspb9k`.

Uwaga architektoniczna: ta blokada jest tymczasowo per `Business`. Po dodaniu pracownikow trzeba zmienic konflikt na per `Employee`, zeby kilka osob moglo miec rownolegle wizyty w tym samym czasie.

## Decyzja architektoniczna - panel admina i konfiguracja klienta

Docelowo powstanie panel admina/operatora, w ktorym podczas dodawania firmy/klienta bedzie mozna wpisac i zapisac dane klienta do bazy. Backend ma potem czytac konfiguracje z bazy dla konkretnego `Business`, zamiast trzymac ustawienia na sztywno w kodzie.

Dotyczy to m.in.:
- nazwy firmy,
- numeru WhatsApp/Twilio (`Business.phoneNumber`),
- strefy czasowej (`Business.timezone`),
- Google Calendar ID (`Business.googleCalendarId`),
- listy uslug i czasow trwania (`Service`),
- godzin pracy,
- pozniej pracownikow, przypisania uslug do pracownikow i ewentualnie kalendarzy pracownikow.

W zwiazku z tym godziny pracy powinny byc dodane jako dane w bazie, a nie jako stale w kodzie. Proponowany model MVP: `BusinessHours` z polami `businessId`, `dayOfWeek`, `opensAt`, `closesAt`, `isClosed`.

Planowany flow:
1. Panel admina tworzy/edytuje `Business`.
2. Panel admina zapisuje `Service` dla biznesu.
3. Panel admina zapisuje godziny pracy w `BusinessHours`.
4. Webhook WhatsApp po numerze `To` znajduje `Business`.
5. Przy rezerwacji backend sprawdza konflikt wizyt oraz godziny pracy z bazy dla tego `Business`.

Kolejny etap implementacji: dodac model godzin pracy w Prisma, seed dla testowego biznesu oraz walidacje, zeby nie umawiac wizyt poza godzinami pracy.

## BusinessHours - godziny pracy z bazy

Dodano model godzin pracy w Prisma: `BusinessHours`. `Business` ma relacje `businessHours BusinessHours[]`. Model przechowuje:
- `businessId`,
- `dayOfWeek` (`0` niedziela, `1` poniedzialek, ..., `6` sobota),
- `opensAt` jako tekst `HH:mm`,
- `closesAt` jako tekst `HH:mm`,
- `isClosed`.

Seed dla `Test Barber` ustawia domyslne godziny:
- niedziela zamkniete,
- poniedzialek-piatek `09:00-18:00`,
- sobota `09:00-14:00`.

Dodano modul `src/modules/businesses/businessHours.ts`, ktory sprawdza, czy `startTime` i `endTime` mieszcza sie w godzinach pracy danego biznesu. Wizyta przechodzaca przez polnoc jest odrzucana.

`createAppointment` przed sprawdzaniem konfliktow wywoluje walidacje godzin pracy. Jesli termin jest poza godzinami, rzuca `AppointmentOutsideBusinessHoursError`. Webhook lapie ten blad, wraca do kroku `CHOOSING_DATE` i prosi uzytkownika o inna godzine.

Weryfikacja techniczna:
- `npx prisma validate` przechodzi,
- `npx prisma db push` zsynchronizowal baze,
- `npx prisma generate` wymagal zamkniecia procesow Node, bo Windows blokowal `query_engine-windows.dll.node`,
- `npx tsc --noEmit` przechodzi,
- seed uzupelnia `BusinessHours`.

Testy:
- `morgen 20:00` dla `broda` zostalo odrzucone jako poza godzinami pracy (`AppointmentOutsideBusinessHoursError`),
- `morgen 10:30` dla `broda` zostalo zapisane poprawnie i utworzylo event w Google Calendar.

Poprawny rekord testowy:
- customer: `whatsapp:+48500999005`,
- service: `broda`,
- startTime: `2026-05-02T08:30:00.000Z`,
- endTime: `2026-05-02T08:50:00.000Z`,
- googleCalendarEventId: `qu4cauuq2le6hos3v4thk2iip8`.

Uwaga: podczas testow bez eskalacji dostep sieciowy do `oauth2.googleapis.com` byl blokowany przez sandbox (`EACCES`), ale test z dostepem sieciowym przeszedl poprawnie.
