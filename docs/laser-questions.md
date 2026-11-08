# Jautājumi LaSER / Questions for LaSER

Status: **open**, not sent yet (2026-11-08). The Latvian text is ready to copy into an email. When answered, write the answer under each question and update `docs/plan-v2.md`.

Already answered by the designer (no need to ask again): text stays editable in the SVG (no outlines); year format is a user choice (2026 / 26); custom width and height are allowed; bar width should be adjustable.

---

Labdien!

Esam uztaisījuši jauno versiju: vienu Excel failu var augšupielādēt, un no katras lapas top grafiks. Ir vairāku sēriju un sakrautie stabiņi, horizontālā versija, vairākas līnijas, laukums zem līnijas un punktu diagramma. Salīdzinājām rezultātu ar maketētājas SVG failiem, un tie sakrīt ļoti tuvu. Lai trāpītu precīzi, mums būtu daži jautājumi:

**1. Valstu krāsas.** 16. un 17. attēlā Igaunija ir gaiši rozā un Lietuva tumši pelēka, bet 25. attēlā otrādi (Lietuva rozā, Igaunija pelēka). Vai ir viena noteikta krāsa katrai valstij, kas vienmēr jāievēro? Un kurš rozā tonis ir pareizais Igaunijai: #F29FC5 (16., 17. att.) vai #F088B6 (7., 9. att.)?

**2. Pārējās valstis.** Sakrautajā grafikā (Portugāle, Ungārija, Čehija, Somija) pārējās valstis rādām pelēkas (#B3B3B3). Vai tas der, vai tām ir cita krāsa?

**3. Programma, kurā atverat SVG.** Illustrator, InDesign vai Word? Teksts SVG failā paliek rediģējams (Montserrat), tāpēc fontam jābūt instalētam datorā. Vai tas tā ir visiem maketētājiem?

**4. Drukai (CMYK).** SVG vienmēr ir RGB. Vai drukai pietiek, ka krāsas pārvēršat maketā, vai programmai jāspēj eksportēt PDF ar CMYK krāsām?

**5. Attēla numurs, virsraksts, avots.** Vai tiem jābūt SVG failā (piemēram, "17. attēls", virsraksts, "Avots: …", "Piezīme: …"), vai tos pievienojat maketā?

**6. Nulle uz ass.** 25. attēlā ass sākas ar "0", bet 17. attēlā ar "0,0". Kurš variants pareizs, ja pārējās vērtības ir ar decimāldaļu?

**7. Grupu secība.** 7. attēlā Igaunija ir pirmā, lai gan Excelī pirmā ir Latvija. Vai grupas kārtojat pēc kāda principa (piemēram, pēc lielākās vērtības), vai brīvi? Mēs pašlaik ievērojam Excel secību, un stabiņus grupas iekšienē var sakārtot no lielākā.

**8. Punktu diagramma ar vairākām rindām** (suverenitātes indekss). Vai vajag novērtējuma joslas virs grafika ("Ļoti vāji 0–4", "Vāji 4–5", …)? Skaidrojošos lodziņus ar karogiem ieteiktu atstāt maketētājai. Vai piekrītat?

**9. 9. attēla dati.** Līnijai ar vērtībām 226 → 1534 (2016–2026) un diviem stabiņu grafikiem (9-50, 9-51) Excel failā nav datu. Vai varat tos atsūtīt, lai varam salīdzināt arī šos?

**10. Programmas valoda.** Vai programmas saskarnei (pogām, izvēlnēm) jābūt latviešu valodā?

Paldies!

---

## English summary (for us)

1. Country → colour mapping is inconsistent across their files; which is canonical, and which Igaunija pink?
2. "Other countries" colour in stacked bars (we use #B3B3B3)?
3. Which app opens the SVGs? Live text needs Montserrat installed.
4. Print: is RGB SVG enough, or do they need CMYK PDF export?
5. Should figure number, title, source and note be inside the SVG?
6. Zero tick: "0" or "0,0"?
7. Group order in grouped bars: rule or manual?
8. Dot plot with several rows: are rating bands needed? Callouts stay with the designer?
9. Data for the 9. attēls charts (to compare those too).
10. Should the UI be in Latvian?

---

# 2. kārta: darba plūsma un saskarne (melnraksts, 2026-11-08)

Status: **draft**. Send it together with the screenshots of the new version (`docs/img/v3-*.png`) and the mockups (`docs/img/mock-*.png`). The English summary is below.

Labdien!

Esam uzlabojuši programmu: tagad var uzreiz ievilkt Excel failu sākumlapā, sarakstā redzami visu grafiku sīktēli, un skaitļus var izlabot tieši programmā. Lai saprastu, kā to padarīt pēc iespējas vienkāršāku pētniekiem, būtu daži jautājumi:

**1. Cik grafiku vienā reizē?** Cik lapu (grafiku) parasti ir vienā Excel failā? Vai viens fails ir viens pētījums, vai katram grafikam savs fails?

**2. Skaitļu labošana.** Ja kāds skaitlis mainās, vai ērtāk to izlabot Excelī un augšupielādēt failu vēlreiz, vai izlabot tieši programmā (tagad var abējādi)? Ja augšupielādē no jauna, vai vajag saglabāt jau veiktos iestatījumus (piemēram, horizontāls, kārtots, stabiņu platums)?

**3. Veco grafiku atvēršana.** Vai pie grafikiem atgriežaties vēlāk (piemēram, pēc gada ar jauniem datiem), vai pietiek, ja pieejami tikai pašreizējā pētījuma grafiki?

**4. Kopīga vai personīga vieta.** Vai visiem LaSER pētniekiem jāredz visi projekti (kopīga vieta), vai katram savi? Kā ar ārējiem pētniekiem, kas strādā tikai pie viena pētījuma? Vai viņiem jāredz tikai savs projekts?

**5. Kādus iestatījumus tiešām maināt?** Kas jums parasti jāpielāgo grafikā (veids, horizontāls/vertikāls, kārtība, skaitļi uz stabiņiem, izmērs, stabiņu platums, krāsas…)? Ko nekad neaiztiekat? Mēs gribētu pārējo paslēpt zem "Vairāk iestatījumu", lai saskarne paliek vienkārša.

**6. Krāsas.** Vai krāsām jābūt fiksētām pēc valstīm (pētnieks tās nevar mainīt), vai jāatstāj iespēja izvēlēties no LaSER paletes?

**7. Darba plūsma.** Pielikumā divas skices: (a) visu grafiku pārskats ar brīdinājumiem un pogu "Lejupielādēt visus", (b) vienkāršots redaktors ar 4 galvenajiem iestatījumiem. Kas no tā jums šķiet noderīgs?

Paldies!

## English summary (round 2)
1. How many charts per Excel file? One file = one paper, or one file per chart?
2. Fixing numbers: in Excel and re-upload, or in the tool? On re-upload, keep their settings?
3. Do they reopen old charts (e.g. a year later), or only the current paper's?
4. Shared team space or personal? Should external researchers see only their own project?
5. Which settings do they actually change, and which never? (Decides what goes behind "More options".)
6. Colours locked to the country palette, or a choice from the LaSER palette?
7. Feedback on the two mockups (set overview, simplified editor).
