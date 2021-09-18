import React from "react";
import { RecognizerContext } from "../context/speechCommand";

export const Test = () => {
  const {
    modifyModel,
    recognize,
    stopRecognize,
    recognizerResult,
    activeRecognizer,
  } = React.useContext(RecognizerContext);
  const count = React.useRef(0);
  React.useEffect(() => {
    count.current = count.current + 1;
    console.log(count.current);
    console.log(activeRecognizer);
  });

  return (
    <>
      <h1>test</h1>
      <button
        onClick={() =>
          modifyModel("abcde", ["test", "rest", "fresh", "ige", "inttic"])
        }
      >
        create
      </button>
      <button onClick={() => modifyModel("azerty")}>modify</button>
      <button onClick={() => recognize("abcde", 100, false)}>
        startRecognize
      </button>
      <button onClick={() => stopRecognize()}>stopRecognize</button>
      {JSON.stringify(recognizerResult)}
    </>
  );
};
