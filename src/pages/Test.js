import React from "react";
import { useRecognizer } from "../context/recognizerContext";

export const Test = () => {
  const {
    modifyModel,
    startRecognize,
    oneRecognize,
    stopRecognize,
    recognizerResult,
  } = useRecognizer();
  return (
    <>
      <h1>test</h1>
      <button onClick={() => modifyModel("azer")}>create</button>
      <button onClick={() => modifyModel("global v003")}>modify</button>
      <button onClick={() => startRecognize("global v003")}>
        startRecognize
      </button>
      <button onClick={() => oneRecognize("global v003")}>oneRecognize</button>
      <button onClick={() => stopRecognize("global v003")}>
        stopRecognize
      </button>
      {JSON.stringify(recognizerResult)}
    </>
  );
};
