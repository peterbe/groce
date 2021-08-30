import { h } from "preact";
import { useState, useEffect,  } from "preact/hooks";

import { useDownloadImageURL } from "../../hooks";

const preloadedImageURLsCache = new Set();

const PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABGElEQVRoge2ZywrDIBBFb5YhbSHd9f9/tJsOSDDqvLQDcyBLnXuSkKgD+PC5ucKQAqtJAUsOAG8AG2OMVmD71XwwxlQ5iuIcCY0AhacxYokyPFdCKnANL5aohedISATuwoskWhONSHAFeuGp5jAbgFMhwRHQ1nKRGBVwCz+jgHv4slDv/dwF8+6dOU3CE6279VLM+7yZ0zQ8UZPQhCeuEi7hiVLCIjxBEq7hiQ2yd77Hjgnhk6RC61vMXZAtyZMCKZACwQWSZDKhF3Ohl9OhNzSht5ShN/WjJ2Z/eayiCT/613Q9ldPcec5v30Ui/OHuquP11pMw6RHMaHDUJEy6NDNbTKWESZ9sRZPvhEF4KVqB5aTAalJglC/2HDhQqwo8YAAAAABJRU5ErkJggg==";

export function DisplayImage({
  filePath,
  file,
  maxWidth,
  maxHeight,
  openImageModal,
  className="img-thumbnail"
}: {
  filePath: string;
  file: File | undefined;
  maxWidth: number;
  maxHeight: number;
  openImageModal: (url: string) => void;
  className?: string;
}) {
  const { url: downloadURL } = useDownloadImageURL(filePath, 1000, false);
  const { url: thumbnailURL, error: thumbnailError } = useDownloadImageURL(
    filePath,
    maxWidth,
    false
  );
  const [loaded, setLoaded] = useState(
    preloadedImageURLsCache.has(thumbnailURL)
  );

  useEffect(() => {
    let mounted = true;

    if (preloadedImageURLsCache.has(thumbnailURL)) {
      return;
    }

    if (thumbnailURL && !thumbnailError) {
      const preloadImg = new Image();
      preloadImg.src = thumbnailURL;

      const callback = () => {
        if (mounted) {
          setLoaded(true);
          preloadedImageURLsCache.add(thumbnailURL);
        }
      };
      if (preloadImg.decode) {
        preloadImg.decode().then(callback, callback);
      } else {
        preloadImg.onload = callback;
      }
    }
    return () => {
      mounted = false;
    };
  }, [thumbnailURL, thumbnailError]);

  useEffect(() => {
    if (downloadURL && !preloadedImageURLsCache.has(downloadURL)) {
      preloadedImageURLsCache.add(downloadURL);
      new Image().src = downloadURL;
    }
  }, [downloadURL]);

  return (
    <a
      href={downloadURL}
      onClick={(event) => {
        event.preventDefault();
        openImageModal(downloadURL || thumbnailURL);
      }}
    >
      <img
        class={className}
        style={{
          width: maxWidth,
          height: maxHeight,
          "object-fit": "cover",
        }}
        src={
          loaded
            ? thumbnailURL
            : file
            ? URL.createObjectURL(file)
            : PLACEHOLDER_IMAGE
        }
      />
    </a>
  );
}
