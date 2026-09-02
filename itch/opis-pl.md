# Piano Song Creator (wersja polska, do wglądu)

Polski odpowiednik `description.md`. Na stronę itch.io idzie wersja angielska; ten plik jest
tłumaczeniem do własnego użytku.

---

Generator utworów fortepianowych, który pisze cały klasyczny utwór na Twoich oczach, w przeglądarce,
z jednej liczby. Wybierasz styl, tonację i naciskasz Play. Ta sama liczba zawsze zapisuje ten sam
utwór, więc do wszystkiego, co Ci się spodoba, można wrócić. Gotowe pobierasz jako MIDI, WAV albo MP3
i możesz z tym zrobić, co chcesz: jest wolne od praw, bo nie weszła w to cudza muzyka.

Dla tych, którzy potrzebują fortepianu w tle, punktu wyjścia do własnego kawałka albo surowego MIDI
do dalszej pracy w DAW. Generuje klasyczny fortepian w szesnastu stylach: nokturny, walce, preludia,
marsze, bluesa i więcej.

Nic tutaj nie jest wytrenowane na cudzej muzyce i nic z niej nie pochodzi. Harmonia, forma i kształt
frazy wynikają ze spisanych reguł, cała reszta z ziarna losowego. To jest zarazem sedno tego
narzędzia i jego ograniczenie, więc zanim zdecydujesz, do czego Ci to potrzebne, przeczytaj
uczciwą część na dole.

## Co potrafi

- **Szesnaście stylów.** Nokturn, preludium, ballada, sonatina, marsz, chorał, elegia i etiuda na
  cztery; walc, menuet, mazurek i polonez na trzy; barkarola, kołysanka i tarantela na sześć ósmych;
  oraz blues, który dostaje własną dwunastotaktową formę, shuffle i bas boogie albo walking.
- **Cały utwór, nie pętla.** Intro, ośmiotaktowy okres powtórzony i wariantowany, część kontrastowa,
  ozdobiona repryza, coda powtarzająca kadencję i rozłożony akord końcowy, któremu pozwolono
  wybrzmieć. Od dwudziestu czterech do pięćdziesięciu taktów, od jednej do trzech minut.
- **Dwie ręce, które losujesz osobno.** Nowa lewa ręka zostawia melodię nuta w nutę. Nowa melodia
  zostawia akompaniament. Obie zostawiają harmonię.
- **Dziewięć brzmień fortepianu,** od ciepłego samplowanego koncertowego po honky-tonk, pianino
  elektryczne i klawesyn.
- **To jest zagrane, nie zsekwencjonowane.** Frazy napierają do przodu i rozszerzają się przy
  kadencji, melodia odzywa się chwilę przed basem, akordy są rozkładane, pedał trzyma akompaniament
  do zmiany harmonii, a każdy styl ma własny zakres dynamiki.
- **Eksport.** MIDI razem z krzywą tempa albo WAV i MP3 renderowane w przeglądarce.

## Czego nie potrafi

To generator regułowy, a nie kompozytor. Gdzie to widać:

- **Nic tu nie zapada w pamięć.** Utwór jest spójny, gdzieś zmierza i porządnie się kończy, ale nie
  ma pomysłu, który warto zanucić. Kompozycja to właśnie ta część, której reguły nie potrafią.
- **Harmonia jest podręcznikowa.** Akordy diatoniczne, kilka dominant wtrąconych, najwyżej jedna
  modulacja i tylko do tonacji równoległej. Harmonicznie nigdy nie dzieje się nic zaskakującego.
- **Frazy zawsze mają cztery takty.** Każdy utwór oddycha w tych samych regularnych kwadratach. Nie
  ma frazy nieregularnej, elizji ani przerwania.
- **Nazwy stylów opisują powierzchnię, a nie idiom.** Chorał to tutaj wolna melodia nad akordami
  blokowymi, a nie czterogłosowa harmonia Bacha. Mazurek to akcent na drugą miarę i rytmy punktowane,
  a nie prawdziwy mazurek. Blues jest jedynym stylem, którego cechy definiujące są naprawdę
  zaimplementowane.
- **Część ziaren jest nudna.** To loteria o dobrych szansach, nie gwarancja. Klikaj Random, aż coś
  Cię złapie, i zapisz sobie wtedy numer.
- **Jedna warstwa dynamiki.** Nuty ciche i głośne różnią się poziomem, ale nie barwą, bo fortepian
  jest samplerem, a nie modelem fizycznym.
- **Pedał jest symulowany przy zmianie akordu,** a nie decydowany uchem. W gęstych miejscach potrafi
  zamulić.
- **Przy pierwszym uruchomieniu potrzebny jest internet,** żeby pobrać próbki fortepianu, i jeszcze
  kilka sekund przy przełączeniu na inne brzmienie.

Jeśli szukasz muzyki w tle, którą można generować bez końca, albo materiału do dalszej pracy w DAW,
to się nadaje. Jeśli szukasz utworu brzmiącego jak skomponowany przez człowieka, nie.

## Sterowanie

Każda zmiana ustawienia od razu generuje nowy utwór. Spacja gra i zatrzymuje. Kliknięcie w piano roll
przestawia głowicę. Dwa suwaki głośności równoważą ręce, a Left articulation skraca i wysusza
akompaniament albo go wydłuża i bardziej pedalizuje. Wewnątrz ramki itch.io przyciski pobierania
otwierają plik w nowej karcie, gdzie przeglądarka go zapisuje.

## Technicznie

Jeden plik HTML, trzy moduły JavaScript, bez kroku budowania i bez serwera. Dźwięk to Tone.js z
fortepianem Salamander i soundfontami General MIDI, kodowanie MP3 przez lamejs. Wszystko liczy się na
Twoim komputerze, nic nigdzie nie jest wysyłane.
