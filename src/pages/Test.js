import React from "react";
import { useRecognizer } from "../context/recognizerContext";

export const Test = () => {
  const { createModel, modifyModel } = useRecognizer();
  return (
    <>
      <h1>test</h1>
      <button onClick={() => createModel("azer")}>create</button>
      <button onClick={() => modifyModel("global v003")}>modify</button>
    </>
  );
};
