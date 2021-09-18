import React from "react";
import { RecognizerContext } from "../context/speechCommand";

export const Test = () => {
  const {
    modifyModel,
    recognize,
    stopRecognize,
    recognizerResult,
    openSavedWordModal,
    // activeRecognizer,
  } = React.useContext(RecognizerContext);
  // const count = React.useRef(0);
  // React.useEffect(() => {
  //   count.current = count.current + 1;
  //   console.log(count.current);
  //   console.log(activeRecognizer);
  // });

  return (
    <>
      <h1>test</h1>
      <button
        onClick={() => modifyModel("abcde", ["test", "rest", "fresh", "ige"])}
      >
        create
      </button>
      <button
        onClick={() => modifyModel("azerty", ["test", "rest", "fresh", "ige"])}
      >
        modify
      </button>
      <button onClick={() => recognize("abcde", 100, false)}>
        startRecognize
      </button>
      <button onClick={() => stopRecognize()}>stopRecognize</button>
      <button onClick={() => openSavedWordModal()}>delete saved Words</button>
      {JSON.stringify(recognizerResult)}
    </>
  );
};
