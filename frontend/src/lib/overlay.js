let locks = 0;
let previousOverflow = "",
  previousPadding = "";
const layers = [];

export function lockPageScroll() {
  if (locks++ === 0) {
    previousOverflow = document.body.style.overflow;
    previousPadding = document.body.style.paddingRight;
    const gutter = innerWidth - document.documentElement.clientWidth;
    if (gutter > 0)
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    }
  };
}

export function registerLayer(element) {
  layers.push(element);
  return () => {
    const index = layers.indexOf(element);
    if (index >= 0) layers.splice(index, 1);
  };
}
export const isTopLayer = (element) => layers.at(-1) === element;

export function trapFocus(event, root) {
  if (event.key !== "Tab" || !root) return;
  const items = [
    ...root.querySelectorAll(
      'button,input,select,textarea,a[href],summary,[tabindex="0"],video[controls]',
    ),
  ].filter(
    (item) =>
      !item.disabled && item.offsetParent !== null && !item.closest("[inert]"),
  );
  const first = items[0],
    last = items.at(-1);
  if (!items.length) {
    event.preventDefault();
    root.focus();
    return;
  }
  if (
    (event.shiftKey &&
      (document.activeElement === first ||
        !root.contains(document.activeElement))) ||
    (!event.shiftKey &&
      (document.activeElement === last ||
        !root.contains(document.activeElement)))
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
