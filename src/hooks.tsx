import { useState, useEffect } from "preact/hooks";
import { FUNCTION_BASE_URL } from "./function-utils";
const preloadCache = new Map<string, boolean>();

const THUMBNAL_CLOUD_FUNCTION_BASE_URL = `${FUNCTION_BASE_URL}/downloadAndResizeAndStore/`;

function getThumbnailURL(image: string, width: number): string {
  const sp = new URLSearchParams();
  sp.set("image", image);
  sp.set("width", `${width}`);
  return `${THUMBNAL_CLOUD_FUNCTION_BASE_URL}?${sp.toString()}`;
}

export function useDownloadImageURL(
  path: string,
  width: number,
  preload = false
) {
  const url = getThumbnailURL(path, width);

  const [error, setError] = useState<Error | null>(null);
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    function cb() {
      if (mounted) {
        preloadCache.set(url, true);
        setPreloaded(true);
      }
    }
    if (preload && !preloadCache.get(url)) {
      const preloadImg = new window.Image();
      preloadImg.src = url;
      // https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-decode
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode#Browser_compatibility
      if (preloadImg.decode) {
        preloadImg
          .decode()
          .then(cb, cb)
          .catch((err) => {
            if (mounted) {
              if (typeof err === "string") {
                setError(new Error(err));
              } else {
                setError(new Error(`error preloading ${url}`));
              }
            }
          });
      } else {
        preloadImg.onload = cb;
        preloadImg.onerror = (err) => {
          if (mounted) {
            if (typeof err === "string") {
              setError(new Error(err));
            } else {
              setError(new Error(`error preloading ${url}`));
            }
          }
        };
      }
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding
      preloadImg.decoding = "sync";
    }
    return () => {
      mounted = false;
    };
  }, [preload, url]);

  return { url, preloaded, error };
}
