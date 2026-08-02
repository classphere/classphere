# Question upload schema

The contract for `POST /api/v1/superadmin/upload-questions` (super_admin only),
as implemented in `apps/api/src/modules/superadmin/superadmin.controller.ts`.

Everything below was read off that handler rather than written from intent, so
where the two disagree the handler is right and this file is a bug.

---

## Request body

```jsonc
{
  "exam": "neet-ug",              // required
  "test_type": "pyq",             // required
  "title": "NEET 2024 Paper",     // required

  // All three optional — omit them and they are derived. See below.
  "duration": 180,                // minutes; override only
  "marks": 720,                   // override only
  "difficulty": "Medium",         // per-question fallback; usually omit

  // Required for jee-advanced, optional elsewhere. See below.
  "marking_scheme": null,

  "subject": "Botany",            // optional — per-question default
  "chapter": "Plant Kingdom",     // optional — per-question default
  "year": 2024,                   // optional — per-question default
  "shift": "1",                   // optional

  "questions": [ /* 1 to 500 */ ]
}
```

| field | required | accepted values |
|---|---|---|
| `exam` | yes | `jee-main`, `jee-advanced`, `jee-main-advanced`, `neet-ug` |
| `test_type` | yes | `chapter-wise`, `mock-test`, `pyq`, `ncert` |
| `title` | yes | any non-empty string |
| `duration` | **no** | positive integer; derived when omitted |
| `marks` | **no** | integer ≥ 0; derived when omitted |
| `difficulty` | **no** | fallback for questions that omit their own |

### Marks and duration are derived

A paper is worth four marks a question, and runs at the pace its exam runs at,
so neither needs stating. They were required, and the stored papers show what
that produced: a 106-question paper out of 360, a 179-question paper out of the
same 360, a 75-question JEE Main paper out of 360 rather than 300.

An upload matching a real sitting gets the real figures; anything smaller is
counted and paced from its own questions:

| exam | questions | marks | minutes |
|---|---|---|---|
| `neet-ug` | 180 | 720 | 180 |
| `neet-ug` | 45 | 180 | 45 |
| `jee-main` | 75 | 300 | 180 |
| `jee-main` | 30 | 120 | 72 |
| `jee-advanced` | 54 | 216 | 180 |
| `jee-advanced` | 18 | 72 | 60 |

JEE Advanced has no fixed structure — question count and total vary by year and
paper — so its total is always four marks a question.

Send `marks` or `duration` explicitly only for a paper with a non-standard
marking scheme.

### Marking scheme

NEET and JEE Main mark every question the same way (+4 correct, −1 wrong), so
they have a default and `marking_scheme` can be omitted.

**JEE Advanced does not.** Its marks differ by question type and change between
years, so an Advanced paper must state its own and the upload rejects it
otherwise — no default can be right for every year, and guessing one would
score real attempts by the wrong rules.

```jsonc
"marking_scheme": {
  "mcq_single": { "correct": 3, "incorrect": -1 },
  "mcq_multi":  { "correct": 4, "incorrect": -2, "partial": "per_correct_option" },
  "integer":    { "correct": 4, "incorrect": 0 },
  "matching":   { "correct": 3, "incorrect": -1 }
}
```

`"partial": "per_correct_option"` gives one mark per correct option chosen when
none of the chosen options is wrong: three of four correct scores 3, one of
three scores 1, and touching a single wrong option takes `incorrect` instead.

`total_marks` is then the sum of what each question is worth, so a paper mixing
+3 and +4 questions totals correctly rather than assuming four throughout.

Stored on the paper, so a 2019 and a 2024 Advanced paper keep their own rules
and re-scoring an old attempt gives the answer it gave at the time.

### Difficulty belongs to questions

A real paper mixes easy, medium and hard, so there is no truthful single value
for the paper. The column is nullable and stays null unless you send one.
Per-question `difficulty` is the field that carries meaning.

**`questions` is capped at 500 per request.** A larger array is rejected
outright, so a 56,000-question bank needs ~113 calls. Chunk it.

---

## One question

```jsonc
{
  "id": "6f2a1c34-9b7e-4d51-8a20-1e5c9f0b3d77",

  "subject": "Botany",
  "chapter": "Plant Kingdom",
  "topic": "Algae",
  "difficulty": "Medium",

  "question_type": "mcq_single",
  "question_text": "Which pigment is characteristic of Rhodophyceae?",
  "question_images": ["https://cdn.example.com/q1-fig1.png"],

  "options": [
    { "id": "A", "text": "Phycoerythrin", "image_url": null },
    { "id": "B", "text": "Fucoxanthin",   "image_url": null },
    { "id": "C", "text": "Chlorophyll b", "image_url": null },
    { "id": "D", "text": "Phycocyanin",   "image_url": null }
  ],
  "correct_answer": ["A"],

  "explanation": "Rhodophyceae store r-phycoerythrin, which masks chlorophyll.",
  "explanation_images": ["https://cdn.example.com/q1-sol.png"],

  "year": 2024,
  "source": "NEET 2024",
  "tags": []
}
```

### Field by field

| field | required | notes |
|---|---|---|
| `id` | **effectively yes** | UUID v4. See the warning below. |
| `question_text` | **yes** | The only field validation rejects a question for. |
| `subject` | no | Falls back to the body-level `subject`, then `"Unclassified"`. |
| `chapter` | no | Falls back to body-level, then `"General"`. |
| `topic` | no | `null` when absent. |
| `difficulty` | no | The meaningful one. Falls back to body-level, else null. |
| `question_type` | no | Normalised; inferred from shape if unrecognised. |
| `question_images` | no | Array of absolute URLs. |
| `options` | no | Array of `{ id, text, image_url }`. |
| `correct_answer` | no | Array. A scalar is wrapped. Missing becomes `[]`. |
| `explanation` | no | Markdown. |
| `explanation_images` | no | Array of absolute URLs. |
| `year` / `source` / `tags` | no | `source` defaults to the body `title`. |

---

## The five things that actually bite

### 1. `id` decides insert vs update

The write is an **upsert keyed on `id`**, and `ensureUUID()` silently mints a
fresh UUID for any id that is missing or not a valid v4.

So a re-upload that generates new ids does not replace the existing bank — it
**doubles** it, and every old broken question stays live and servable. Reuse the
ids already in the table, or clear it first.

### 2. `correct_answer` — letters, please

```jsonc
"correct_answer": ["A"]        // preferred
"correct_answer": ["A", "C"]   // multi-correct: the complete set
"correct_answer": ["12.5"]     // integer type: the value itself
```

Index keys (`[2]`, `"3"`) are tolerated — the grader resolves them through the
question's own options — but one format across the bank is worth having.

An empty `correct_answer` makes the question **unscoreable**. It no longer
costs the student marks, but it cannot be graded either. 3,795 questions in the
current bank are in this state.

### 3. Figures go in arrays, never in `image_url`

```jsonc
"question_images":    ["https://…/fig1.png", "https://…/fig2.png"],
"explanation_images": ["https://…/sol1.png"],
"options": [{ "id": "A", "text": "…", "image_url": "https://…/optA.png" }]
```

`image_url` on the **question** no longer exists. It survives on **options**,
where one figure per option is the right shape.

Inline `![](…)` markdown inside `question_text` also works — ingest pulls it
out into `question_images` and strips it from the text, so a figure never
renders twice. Either form is fine; both produce the same row.

Bare filenames (`_page_2_Figure_1.jpeg`) are discarded. Only `http(s):` and
`data:` URLs survive.

### 4. `question_type` — five values

`mcq_single`, `mcq_multi`, `integer`, `matching`, `assertion_reason`.

A database CHECK enforces these, but ingest normalises first, so `MCQ`, `MSQ`,
`Numerical`, `Single Correct` and similar all land correctly. An unrecognised
value falls back to the question's shape: options present means `mcq_single`,
none means `integer`.

**NEET has no `integer` questions.** Every NEET question is one of the MCQ types.

### 5. `subject` — Botany and Zoology, not Biology

NEET is examined as two separate sections. `"Biology"` is accepted but cannot be
assigned to either afterwards, and 2,863 rows are already stuck that way.

Accepted: `Physics`, `Chemistry`, `Mathematics`, `Botany`, `Zoology`, `Biology`.
Casing and short forms (`phy`, `maths`, `bio`) normalise. Anything else becomes
`"Unclassified"`.

---

## Normalisation checklist

Problems measured across the current 56,314 rows. Worth fixing at source while
the JSON is being regenerated:

| check | rows affected today |
|---|---|
| every question has a stable `id` reused from the table | — |
| `correct_answer` non-empty | 3,795 empty |
| options have real text or an image | 853 entirely blank |
| option `id`s unique within a question | 306 duplicated |
| non-`integer` questions have ≥ 2 options | 376 with none |
| answer key is within the option range | 60 out of range |
| answer key matches an option id | 61 do not |
| NEET biology split into Botany / Zoology | 2,863 as `Biology` |
| subject assigned | 7 `Unclassified` |
| exactly 4 options for JEE/NEET MCQs | 18 with 5 or 8 |

The last four in that list cannot be repaired in code — the correct answer is
genuinely unknowable from the row — so they are the ones only a re-upload can
fix.
