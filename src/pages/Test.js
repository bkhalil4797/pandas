import React from "react";
import { RecognizerContext } from "../context/speechCommand";
import localforage from "localforage";

export const Test = () => {
  const { modifyModel, recognize, stopRecognize, recognizerResult } =
    React.useContext(RecognizerContext);
  const handleClick = async () => {
    const decoder = new TextDecoder("UTF-8");

    await localforage.getItem("test", (err, value) => {
      console.log(decoder.decode(value));
    });
  };
  return (
    <>
      <h1>test</h1>
      <button onClick={() => modifyModel("abcde")}>create</button>
      <button onClick={() => modifyModel("azerty")}>modify</button>
      <button onClick={() => recognize("abcde", 100, false)}>
        startRecognize
      </button>
      <button onClick={() => stopRecognize()}>stopRecognize</button>
      <button onClick={() => handleClick()}>test</button>
      {JSON.stringify(recognizerResult)}
    </>
  );
};
