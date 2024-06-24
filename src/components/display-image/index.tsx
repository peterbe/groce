import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

import { getThumbnailURL, PLACEHOLDER_IMAGE } from "../../utils";

import type { openImageModalSignature } from "../../types";

const preloadedImageURLsCache = new Set();

type ImageStyle = {
  width: number;
  height?: number;
  "object-fit"?: string;
};

export function DisplayImage({
  filePath,
  file,
  maxWidth,
  maxHeight,
  openImageModal,
  className = "rounded",
  thumbnailWidth = null,
  useObjectFit = false,
  placeholderImageData = undefined,
}: {
  filePath: string;
  file: File | undefined;
  maxWidth: number;
  maxHeight: number;
  openImageModal: openImageModalSignature;
  className?: string;
  thumbnailWidth?: number | null;
  useObjectFit?: boolean;
  placeholderImageData?: string | undefined;
}): h.JSX.Element {
  const downloadURL = getThumbnailURL(filePath, 1000);
  const thumbnailURL = getThumbnailURL(filePath, thumbnailWidth || maxWidth);

  useEffect(() => {
    if (downloadURL && !preloadedImageURLsCache.has(downloadURL)) {
      preloadedImageURLsCache.add(downloadURL);
      new Image().src = downloadURL;
    }
  }, [downloadURL]);

  const style: ImageStyle = {
    width: maxWidth,
  };
  if (useObjectFit) {
    style.height = maxHeight;
    style["object-fit"] = "cover";
  }

  return (
    <a
      href={downloadURL}
      onClick={(event) => {
        event.preventDefault();
        openImageModal(downloadURL || thumbnailURL, file);
      }}
    >
      <DisplayImageTag
        className={className}
        style={style}
        url={thumbnailURL}
        file={file}
        placeholderImageData={placeholderImageData}
      />
    </a>
  );
}

export function DisplayImageTag({
  className,
  style,
  url,
  file,
  placeholderImageData = undefined,
}: {
  className?: string;
  style: h.JSX.CSSProperties;
  url: string;
  file: File | undefined;
  placeholderImageData?: string | undefined;
}): h.JSX.Element {
  const [loaded, setLoaded] = useState(preloadedImageURLsCache.has(url));

  useEffect(() => {
    let mounted = true;

    if (preloadedImageURLsCache.has(url)) {
      return;
    }

    if (url) {
      const preloadImg = new Image();
      preloadImg.src = url;

      const callback = () => {
        if (mounted) {
          setLoaded(true);
          preloadedImageURLsCache.add(url);
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
  }, [url]);

  return (
    <img
      class={className}
      style={style}
      src={
        loaded
          ? url
          : file
            ? URL.createObjectURL(file)
            : placeholderImageData
              ? placeholderImageData
              : PLACEHOLDER_IMAGE
      }
    />
  );
}
