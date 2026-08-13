# Why the glass keeps coming out opaque

`backdrop-filter` fails **silently**. It does not error, it does not warn — the
card just renders as a flat tinted rectangle and looks like a styling choice.
Nearly every time, the cause is an **ancestor**, not the card.

Read this before touching any card styles.

---

## The rule underneath all of it

`backdrop-filter` blurs whatever is painted behind the element, up to its
**backdrop root**. Certain properties on an *ancestor* create a new backdrop
root — and then the card can only sample inside that ancestor. If the ancestor
has no background of its own, the card samples **nothing** and you get a flat
fill.

## Properties that break it — on ANY ancestor

None of these may appear on any parent of a `.card`, all the way up to `<body>`:

- `filter` (even `filter: none` written as a transition)
- `transform` — **including a translate used for an entrance animation**
- `perspective`
- `will-change: transform` / `will-change: filter` / `will-change: opacity`
- `opacity` less than 1
- `isolation: isolate`
- `contain: paint` or `contain: strict`
- `mix-blend-mode` other than `normal`
- `backdrop-filter` itself

`overflow: hidden` and `border-radius` on an ancestor are **fine**.

## The one that will actually bite you

The entrance animation. If cards fade and rise via a wrapper:

```jsx
// BREAKS THE GLASS — the wrapper's transform becomes the backdrop root
<motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
  <Card />
</motion.div>
```

A transform on the **card itself** is fine. A transform on a **wrapper around
it** is not. So animate the card element directly:

```jsx
<Card className="card enter" />       // .enter animates transform + opacity
```

Same trap applies to any list wrapper with `will-change` for scroll
performance, and to framer-motion's `<AnimatePresence>` wrappers.

## The other two

**The scroll container must have no background.** If `.list` has
`background: #000`, that black is the only thing the blur can sample. Leave it
transparent and let the particle canvas show through.

**The particle canvas must be a sibling behind the cards, not a parent.** Same
stacking context, lower `z-index`. If the canvas is inside a wrapper that also
contains the cards and that wrapper has any property from the list above, it is
dead.

---

## Verify it, do not eyeball it

A flat card and a working card look nearly identical over black. Test properly:

1. Temporarily set the page background to a bright photo or a lime-green block.
2. Every card must visibly pick up that colour, blurred.
3. If they stay grey, the backdrop root is broken — walk up the DOM looking for
   the properties above.
4. Put the black back.

Second check: scroll the list. A working card's fill **changes** as particles
pass beneath it. A broken one is constant.

---

## Required CSS

```css
.card{
  background: rgba(255,255,255,.085);
  -webkit-backdrop-filter: blur(18px) saturate(180%) brightness(1.15);
          backdrop-filter: blur(18px) saturate(180%) brightness(1.15);
}
```

The `-webkit-` prefix is not optional — Safari still needs it, and Safari is
the browser your demo will be recorded on.

`saturate(180%) brightness(1.15)` is doing real work: without them the blurred
copper desaturates to grey and the card reads as frosted plastic instead of
glass. Do not drop them for "simplicity".

---

## If it still will not work

Fall back to a fake backdrop, which is bulletproof because it does not use the
feature at all: render a second copy of the particle canvas inside each card,
absolutely positioned so it aligns with the global one, with `filter: blur(18px)`
on it and `overflow: hidden` on the card. Costs one extra blit per card and
works everywhere, including in a screen recording on an old device.

---

## The false negative — tint what the card samples, not an ancestor

A card that is broken and a card that is working but badly tested look
**identical**. This one cost real time, so it is written down.

When running the lime test, tint **the element the card actually samples**.

In this app that is the particle canvas (`#pf` on ob6b), or the `Device` div
that paints `bg-black` on the main tabs. Tinting the *phone frame* fails,
because `Device` paints its own black background on top of the frame — so the
card is correctly sampling black, the pixels do not change, and the test
reports a broken backdrop root that is not broken.

```js
// FALSE NEGATIVE — Device paints bg-black over this
phoneFrame.style.background = '#7CFF00';

// CORRECT — the layer the card is actually blurring
document.querySelector('canvas').style.background = '#7CFF00';
```

If the test says flat, before touching any CSS, walk the ancestor chain from
the card to `<body>` and check each computed style against the list above. If
that chain is clean, suspect the test, not the card.
