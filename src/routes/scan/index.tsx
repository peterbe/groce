import { FunctionalComponent, h } from "preact";
import style from "./style.css";
import { useEffect, useState } from "preact/hooks";
import Tesseract from "tesseract.js";

import { GoBack } from "../../components/go-back";

const Outer: FunctionalComponent = () => {
  return (
    <div class={style.scan}>
      <h2>Scan from photo</h2>
      <Scan />

      <GoBack />
    </div>
  );
};

export default Outer;

const Scan: FunctionalComponent = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = "Scan from photo";
  }, []);

  const [pageData, setPageData] = useState<null | false | Tesseract.Page>(null);

  const [progress, setProgress] = useState<null | number>(null);

  const [tesseractError, setTesseractError] = useState<Error | null>(null);

  async function getText(imageFile: File) {
    Tesseract.recognize(imageFile, "eng", {
      logger: (m) => {
        if (m.progress) {
          setProgress(100 * m.progress);
        }
        console.log(m);
      },
    })
      .catch((err) => {
        console.error(err);
        setTesseractError(err);
      })
      .then((result) => {
        // Get Confidence score
        if (result) {
          // const data = result.data;
          const { data } = result;
          // console.log("DATA:", data);
          setPageData(data);
        } else {
          console.log("NO RESULT!");
          setPageData(false);
        }
        // let confidence = result.confidence;
        // let text = result.text;
        // setText(text);
      });
  }
  if (pageData) {
    console.log(pageData.lines[0]);
  }

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg, image/png"
        // XXX should this be onInput??
        onChange={(event) => {
          const input = event.target as HTMLInputElement;

          if (!input.files?.length) {
            console.warn("XXX No files!");
            return;
          }
          const file = input.files[0];
          setImageFile(file);
        }}
      />
      <br />

      {tesseractError && (
        <div class="alert alert-danger" role="alert">
          Scan error: <code>{tesseractError.toString()}</code>
        </div>
      )}

      {pageData === false && (
        <div class="alert alert-warning" role="alert">
          Scan found nothing ☹️
        </div>
      )}

      {imageFile && (
        <p>
          {(imageFile.type === "image/jpeg" ||
            imageFile.type === "image/png") && (
            <figure class="figure">
              <img
                src={URL.createObjectURL(imageFile)}
                // width={600}
                style={{ maxWidth: 600, maxHeight: 500 }}
                class="figure-img img-fluid rounded"
                alt="..."
              />
              <figcaption class="figure-caption">
                <code>{imageFile.name}</code> ({humanFileSize(imageFile.size)})
              </figcaption>
            </figure>
          )}
          <br />
          <button
            class="btn btn-primary"
            onClick={() => {
              // getText('https://tesseract.projectnaptha.com/img/eng_bw.png')
              getText(imageFile);
            }}
          >
            Scan now
          </button>{" "}
          {(imageFile || pageData) && (
            <button
              class="btn btn-secondary"
              onClick={() => {
                setImageFile(null);
                setPageData(null);
              }}
            >
              Reset
            </button>
          )}
          <br />
          {progress !== null && progress < 100 && (
            <div class="progress">
              <div
                class="progress-bar"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {Math.round(progress)}%
              </div>
            </div>
          )}
        </p>
      )}
      {pageData && (
        <div>
          <hr />

          <b>Text</b>
          <pre>{pageData.text}</pre>

          <p>
            <b>Words</b>
            {pageData.words.map((word, i) => {
              if (i === 0) {
                console.log("word:", word);
              }
              if (word.text.length <= 1) {
                // Too short to ever be useful
                return null;
              }
              return (
                <button
                  key={`${word.text}${i}`}
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  title={`Confidence: ${word.confidence.toFixed(1)}%`}
                >
                  {word.text}
                </button>
              );
            })}
          </p>
          <b>Lines</b>
          {pageData.lines.map((line, i) => {
            if (i === 0) {
              console.log("LINE:", line);
            }
            return (
              <button
                key={`${line.text}${i}`}
                type="button"
                class="btn btn-outline-secondary btn-sm"
                title={`Confidence: ${line.confidence.toFixed(1)}%`}
              >
                {line.text}
              </button>
            );
          })}
          {/* <pre>{JSON.stringify(pageData.lines[0], null, 2)}</pre> */}
        </div>
      )}
    </div>
  );
};

function humanFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const num = size / Math.pow(1024, i);
  const round = Math.round(num);
  const numStr: string | number =
    round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round;
  return `${numStr} ${"KMGTPEZY"[i - 1]}B`;
}
