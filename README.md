# paperprintouts.com

Printable paper and worksheet generators that run entirely in the browser. No build step for
the site's JavaScript, no dependencies, no server. Deployed on GitHub Pages behind an apex
CNAME, the same shape as the rest of the portfolio.

## Why these tools

Most printable paper online is a fixed PDF. If you need ¾ inch hexagons and the file is 1 inch,
the file is no use to you. Everything here is drawn from its measurements instead.

The nine generators were picked from a market audit rather than guessed — see
`../paperprintouts-research.md`. Generic graph paper is a red ocean, so the anchors are the
specialist geometries where the incumbents are static PDFs or paywalled:

| Tool | Why it exists |
| --- | --- |
| English paper piecing templates | The whole market is fixed-size PDFs; one blog ships "6 shapes, 20 sizes, 104 sheets" |
| Bubble answer sheets | The best free competitor watermarks its output and charges to remove it |
| Blank clock faces | Incumbents are server-side or static, and most draw the hour hand wrong |
| Blank periodic table | The SERP is owned by non-customisable images |
| Attendance / gradebook grids | Everyone ships a spreadsheet; nobody ships "paste 28 names, print" |
| Graph, dot grid, lined paper | Table stakes — present for completeness and long-tail, not to win head terms |
| Print calibration | Everything else depends on the printer not silently scaling |

## How it fits together

`build.py` generates every page from the specs at the top of the file, writing each one twice:
as `slug/index.html`, which serves the clean URL, and as a flat `slug.html` alias. GitHub Pages
will not infer a content type for an extensionless file — it serves it as
`application/octet-stream` and the browser downloads it instead of rendering. That is the
mistake hueshift shipped, and it is designed out here.

```sh
python3 build.py          # regenerate every page and the sitemap
python3 -m http.server    # serve it
```

`assets/app.js` is the shared framework. A generator registers itself and gets the control
panel, paper size and orientation, margins, URL state, localStorage, print and SVG download for
free:

```js
PP.register('graph-paper', {
  controls: [ { id: 'spacing', label: 'Spacing (mm)', type: 'number', default: 5 } ],
  render: function (v) { return '<path d="..." stroke="#9aa3ad"/>'; }
});
```

`render` returns SVG **children** with every coordinate in millimetres. The framework wraps
them in `<svg width="215.9mm" height="279.4mm" viewBox="0 0 215.9 279.4">`, which is what makes
the sheet print at true physical size. Returning an array produces one printed page per entry —
that is how a pasted roster prints thirty named sheets in one job.

## True scale

The claim that a 100 mm square prints as 100 mm is verified, not assumed. Printing
`/print-calibration/` to PDF through headless Chrome gives a MediaBox of 612 × 792 pt — exactly
US Letter — and a composite user-space transform of 2.834645 pt per unit, so the 100-unit square
measures 283.46 pt, which is 100.00 mm.

Two things that break it, both guarded: a print dialogue set to "fit to page" (hence the
calibration page), and any stray element escaping the print stylesheet onto a second sheet.

## Deploying

1. Register the domain — as of writing it is available but **not yet registered**.
2. Point the apex at GitHub Pages and enable Pages on the `main` branch.
3. `CNAME` is already in the repo.
