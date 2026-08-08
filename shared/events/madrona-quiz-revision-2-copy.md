# Madrona Quiz — Revision 2 Copy Deck

The question copy for `madrona.us/musicintheplayfield` as authored,
together with what each source actually supports. Everything inside the
quoted blocks below is player-facing; everything outside them is the
reasoning, which is the part that cannot be recovered from the code.

[`madrona-demo-game-content.ts`](./madrona-demo-game-content.ts) is
transcribed from this deck, and the two were byte-identical when it
landed. They are two files, so they can drift: the module is what
publishes and wins, and a copy edit made here alone changes nothing a
player sees. Edit both.

Neither file is what the live event renders. The event renders the
published rows, which are edited through /admin; the module is the seed
that bootstraps a fresh environment. A correction that has to reach
tonight's players goes through /admin.

There is no sponsor line on the quiz and no sponsor attribution on any
question.

## How source lines are authored

Each source is one line in the question's `sources` list. Two inline
constructs are supported and everything else in the line renders
literally:

- `*emphasis*` — used for book and report titles.
- `[visible text](https://example.com/page)` — an inline link. The
  visible text is always the title of the piece, never a bare address
  and never a word like "here." Link visible text may itself be
  emphasized.

This grammar is parsed for source lines and nowhere else. Prompts,
option labels, and explanations render as plain text, so `*a title*` in
an explanation prints its asterisks on screen — question 3 names
*Waiting for the Interurban* without markup for that reason. Explanations
do split into paragraphs on a blank line.

Whether a link points at a PDF is derived from the address at render
time. Do not mark it by hand.

Entries with no link are print books. They stay in the list as plain
text.

**Link verification.** Every link below was retrieved on 2026-08-08 and
each page was checked against the claim it is cited for — not merely
for a 200 response. All resolved without redirect, and every title and
author attribution matches what is written here. Re-verify before the
next event and update this date. A dead citation is worse than no
citation, and a live one pointing at something other than what the
sentence says is worse still.

---

## Question 1

**Prompt**

> What was the first thing in the neighborhood to be named Madrona?

**Options** — correct answer first; the runtime shuffles them.

1. A private trolley park *(correct)*
2. A schoolhouse
3. A streetcar line
4. A real estate plat

**Explanation** — two paragraphs, separated by a blank line.

> The land company developing the hillside laid out a private park on
> the waterfront to anchor the trolley line it was building, which was
> a standard trick for selling lots. J. E. Ayer, one of the property
> owners who contributed ground for the park, suggested calling it
> Madrona after the tree. However, this might have been more of a
> marketing move than a description, since there were very few of that
> tree in the area. Parks historian Don Sherwood's files say the park
> held "scarcely more than a few little (Madrona) sprouts," and a
> Seattle Post-Intelligencer story from September 6, 1927 called the
> name "a pioneer jest," because madrona trees "were not that prominent
> a feature."
>
> The name travelled up the hill, and fast. Pretty soon the entire
> neighborhood was called Madrona, and the landmarks followed one at a
> time. The schoolhouse at the top of the hill, Randell School, became
> Madrona in 1904 when a new building replaced the original barn. The
> road down to the park became Madrona Drive in 1915. The streetcar was
> the #8 Madrona by the 1930s.

**Sources**

```
Don Sherwood, [Madrona Park](https://www.seattle.gov/documents/Departments/CityArchive/Sherwood/MadronaPk.pdf) and [Madrona Playground](https://www.seattle.gov/documents/departments/cityarchive/sherwood/madronapg.pdf) history sheets, Don Sherwood Parks History Collection, Seattle Municipal Archives
Nile Thompson, Carolyn J. Marr, and Nick Rousso, [Seattle Public Schools, 1862-2023: Madrona Elementary School](https://www.historylink.org/File/10551), HistoryLink Essay 10551
[Madrona Drive](https://www.writesofway.org/madrona-drive/), Writes of Way
[Seattle's East Union and Madrona Streetcar](https://ba-kground.com/seattles-east-union-and-madrona-streetcar/), ba-kground
Junius Rochester, [Seattle Neighborhoods: Madrona, Thumbnail History](https://www.historylink.org/file/2235), HistoryLink Essay 2235, 1999
```

---

## Question 2

**Prompt**

> In 1969, the Seattle chapter of the Black Panther Party launched its
> Free Breakfast Program for schoolchildren at which Madrona location?

**Options** — unchanged from the current quiz.

1. Madrona Grace Presbyterian Church *(correct)*
2. Madrona Elementary School
3. The Madrona Branch Library
4. Madrona Community Center

**Explanation**

> The program launched at 832 32nd Avenue, the building that is Madrona
> Grace Presbyterian Church today. In 1969 it went by Madrona Community
> Presbyterian Church, having merged with Grace Presbyterian in 1953.
> Elmer Dixon III coordinated it. From that one kitchen the program grew
> to five locations and served an estimated 300,000 meals between 1969
> and 1977.

**Sources**

```
Linda Holden Givens, [Black Panther Party Seattle Chapter (1968-1978)](https://www.historylink.org/File/20648), HistoryLink Essay 20648, 2018
Jeffrey Zane and Judson L. Jeffries, "A Panther Sighting in the Pacific Northwest: The Seattle Chapter of the Black Panther Party," in *On the Ground: The Black Panther Party in Communities Across America*, University Press of Mississippi, 2010, pages 41 to 95
Quintard Taylor, *The Forging of a Black Community: Seattle's Central District from 1870 through the Civil Rights Era*, University of Washington Press
[Our Story](https://www.madronagrace.org/about-us/our-story), Madrona Grace Presbyterian Church
```

---

## Question 3

**Prompt**

> What is the statue outside the Madrona library called?

**Options** — unchanged from the current quiz.

1. The Peaceable Kingdom *(correct)*
2. The Lion and the Lamb
3. Common Ground
4. The Madrona Menagerie

**Explanation**

> Richard Beyer, who also made Waiting for the Interurban in Fremont,
> cast the aluminum group and it was installed on the library lawn in
> 1984. The panther and the pig sit on top of a granite boulder, with
> the wolf and the sheep at the base. The four animals stand in for
> groups living in the neighborhood at the time, the panther for the
> Black Panthers, the pig for the police, the sheep for the elderly, and
> the wolf for the street toughs, all coexisting peaceably. The name
> became the neighborhood's unofficial motto.

**Sources**

```
David Wilma, [Madrona-Sally Goldmark Branch, The Seattle Public Library](https://www.historylink.org/File/4034), HistoryLink Essay 4034, 2002
[Madrona-Sally Goldmark Branch Highlights](https://www.spl.org/hours-and-locations/madrona-sally-goldmark-branch/madrona-sally-goldmark-branch-highlights), The Seattle Public Library
Brangien Davis, [Madrona: Best Seattle Neighborhoods 2013](https://seattlemag.com/home-garden/madrona-best-seattle-neighborhoods-2013), Seattle Magazine
Thomas Veith, [*History of the Central Area*](https://www.seattle.gov/documents/Departments/Neighborhoods/HistoricPreservation/HistoricResourcesSurvey/context-central-area.pdf), Seattle Historic Preservation Program, 2009
```

---

## Question 4

**Prompt**

> What is the current use of the Madrona Bathhouse on the waterfront in
> Madrona Park?

**Options** — unchanged from the current quiz.

1. A dance studio *(correct)*
2. A community theater
3. A clay studio
4. A boathouse for kayak and paddleboard rentals

**Explanation**

> A wood-frame bathhouse went up in 1919 and was replaced by the brick
> building that still stands, built in two parts across 1927 and 1928.
> Swimmers gave way to dancers in 1971, when a second story was added to
> create studio space. Spectrum Dance Theater, founded in 1982, has been
> based there since, with choreographer Donald Byrd as artistic director
> since 2002.

**Sources**

```
[Madrona Bathhouse Home of Spectrum Dance Theater](https://theclio.com/entry/106625), Clio
Don Sherwood, [Madrona Park history sheet](https://www.seattle.gov/documents/Departments/CityArchive/Sherwood/MadronaPk.pdf), Seattle Municipal Archives
Erin Naomi Burrows, [Byrd and the Bath House: A Case Study of Spectrum Dance Theater (1982-2012)](https://scholarworks.seattleu.edu/spectrum-dance-theater/1), Seattle University, 2019
[Spectrum Dance Theater, About](https://www.spectrumdance.org/about)
```

---

## Question 5

**Prompt**

> Before being renamed to MLK Jr Way, what was the name of the street
> that borders the western edge of Madrona?

**Options** — unchanged from the current quiz.

1. Empire Way *(correct)*
2. Hill Way
3. Cascade Way
4. Pacific Way

**Explanation**

> Empire Way honored railroad magnate James J. Hill, "the empire
> builder." The campaign to change it started with a radio show:
> activist Eddie Rye Jr. was hosting a program on Black station KYAC,
> with Jesse Jackson as his guest, when he learned that cities around
> the country were honoring Dr. King locally. Rye gathered 4,000
> signatures, the City Council voted unanimously in July 1982, and then
> 36 merchants sued to stop it, objecting mainly to what changing their
> address would cost them. The Washington State Supreme Court ruled
> against them on November 30, 1983, and the city went back to making
> signs the next day. A crowd gathered to unveil the final one on
> January 15, 1984.

**Sources**

```
Kathleen Kemezis, [Hundreds celebrate the placement of the last sign to designate Seattle's new Martin Luther King Jr. Way on January 15, 1984](https://www.historylink.org/File/9568), HistoryLink Essay 9568, 2010
Feliks Banel, [Seattle's long-ago battle to honor Dr. Martin Luther King Jr.](https://mynorthwest.com/local/battle-honor-martin-luther-king-jr/946066), MyNorthwest, 2018
```

---

## Rules the explanations follow

**They never refer back to the answer options.** By the time a player
reads an explanation the choices are gone from the screen, so a line
like "the school was Randell School" reads as a non sequitur unless the
explanation earns it on its own. Question 1's closing paragraph tracks
the name travelling uphill and picking up the school and the streetcar
along the way, so it lands the same facts as a story rather than as an
answer key. Hold to this for any question added later.

**Claims that could not be pinned down are absent rather than
guessed.** There is no recorded year for the streetcar line's renaming,
and no record of a plat ever renamed Madrona, so neither appears. An
earlier draft of question 5 said the West Coast renamed its streets in
a single year; nothing supports that, so it is gone.

**Where sources conflict, the conflict is resolved in the copy, not
left to the reader.** Rochester's HistoryLink essay calls the madronas
"ubiquitous," which the Sherwood files and the 1927 Post-Intelligencer
both contradict; it is cited for the Union Trunk Line and general
history rather than for the trees.

Question 5's two sources disagree twice, and the copy is written to the
overlap rather than picking a winner. Banel dates the KYAC broadcast
that started the campaign to November 1980; Kemezis has Rye circulating
the petition early in 1981 and mentions neither the station nor Jackson.
So the explanation tells the radio-show story with no date attached. The
two also part on what happened the day after the ruling — Kemezis says
the city resumed manufacturing signs, Banel says installation began — so
the copy says the city went back to making signs, which is true under
either account. Naming a date or an installation here would put the
explanation at odds with the first source a reader clicks.

**Question 3 is the case that proves the point.** HistoryLink's essay
says the animals "have their paws on a book." There is no book. The
Seattle Public Library's own page for the branch describes the piece as
"a panther and a pig are on top of a granite boulder, while a wolf and
a sheep are placed at the base," and no other source mentions a book.
The explanation follows the library, and the library page is now cited
alongside Wilma, who remains the source for the artist, the aluminum,
and the 1984 installation — none of which anything contradicts.

That is the argument for showing sources at all. A neighbor who walks
past the statue would have caught the book too, and the citation is
what lets them check the claim instead of quietly distrusting the whole
quiz.
