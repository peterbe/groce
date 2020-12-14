// import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

const preloadCache = new Map<string, boolean>();

export function getThumbnailPath(path: string, width: number): string {
  const imageBasename = path.split("/").slice(-1)[0];
  const withoutExtension = imageBasename.split(".").slice(0, -1).join(".");
  const extension = imageBasename.split(".").slice(-1)[0];
  const thumbnailsFolderPath = [
    ...path.split("/").slice(0, -1),
    "thumbnails",
  ].join("/");
  return `${thumbnailsFolderPath}/${withoutExtension}_${width}x${width}.${extension}`;
}

const THUMBNAL_CLOUD_FUNCTION_BASE_URL =
  "https://us-central1-thatsgroce.cloudfunctions.net/downloadAndResize/";

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
              setError(err);
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
  }, [preload]);

  return { url, preloaded, error };
}
