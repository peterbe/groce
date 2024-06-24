import { FUNCTION_BASE_URL } from "./function-utils";

export function stripEmojis(s: string): string {
  return s
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    )
    .trim();
}

const THUMBNAL_CLOUD_FUNCTION_BASE_URL = `${FUNCTION_BASE_URL}/downloadAndResizeAndStore/`;

export function getThumbnailURL(image: string, width: number): string {
  const sp = new URLSearchParams();
  sp.set("image", image);
  sp.set("width", `${width}`);
  return `${THUMBNAL_CLOUD_FUNCTION_BASE_URL}?${sp.toString()}`;
}

export const PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABGElEQVRoge2ZywrDIBBFb5YhbSHd9f9/tJsOSDDqvLQDcyBLnXuSkKgD+PC5ucKQAqtJAUsOAG8AG2OMVmD71XwwxlQ5iuIcCY0AhacxYokyPFdCKnANL5aohedISATuwoskWhONSHAFeuGp5jAbgFMhwRHQ1nKRGBVwCz+jgHv4slDv/dwF8+6dOU3CE6279VLM+7yZ0zQ8UZPQhCeuEi7hiVLCIjxBEq7hiQ2yd77Hjgnhk6RC61vMXZAtyZMCKZACwQWSZDKhF3Ohl9OhNzSht5ShN/WjJ2Z/eayiCT/613Q9ldPcec5v30Ui/OHuquP11pMw6RHMaHDUJEy6NDNbTKWESZ9sRZPvhEF4KVqB5aTAalJglC/2HDhQqwo8YAAAAABJRU5ErkJggg==";
