import React from "react";
import { useRecognizer } from "../context/speechCommand";

export const Test = () => {
  const { modifyModel, recognize, stopRecognize, recognizerResult } =
    useRecognizer();
  return (
    <>
      <h1>test</h1>
      <button onClick={() => modifyModel("abc")}>create</button>
      <button onClick={() => modifyModel("azerty")}>modify</button>
      <button onClick={() => recognize("azerty")}>startRecognize</button>
      <button onClick={() => stopRecognize()}>stopRecognize</button>
      {JSON.stringify(recognizerResult)}
    </>
  );
};
