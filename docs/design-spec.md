# Design Spec

## Existing visual system

- Page background uses `--bg: #070a12`; cards use the existing dark surfaces and fine `--line` borders.
- Cyan (`--cyan: #7dd3fc`) is the main interaction accent; amber is reserved for secondary highlights.
- Typography uses the existing display, body, and mono font tokens. Keep existing radius and spacing tokens.
- Station scene uses dark glass, cyan indicators, restrained metal trim, and a low contrast vignette.

## Contact area

- Make the email address the primary contact action and show the address itself.
- Keep GitHub and the PDF resume as secondary actions with clear labels and consistent alignment.
- Reuse current typography, dark surfaces, cyan hover state, and responsive breakpoints.

## Station house

- Preserve the transparent greenhouse-like house silhouette and readable interior.
- Improve glass with restrained pane divisions, edge highlights, fine metal framing, and subtle interior light.
- Avoid opaque wall fills, heavy structural framing, and extra raised bases.

## Station gateway

- Keep the existing modal, focus handling, ESC behavior, and iframe lifecycle.
- Make loading feedback visually clear without covering the station scene with a large opaque panel.
- Animate both opening and closing; honor `prefers-reduced-motion`.
- When the scene is ready, show mouse operation icons without visible instructional text; keep accessible labels.
