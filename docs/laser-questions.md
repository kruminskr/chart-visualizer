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
