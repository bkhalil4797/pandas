import { useState, useEffect, useCallback } from "react";
import { useRecognizer } from "../context/recognizerContext";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";
import localforage from "localforage";

const epochs = 50;
const ModifyModel = () => {
  const { recognizer, activeRecognizer, savedModelList, cachedModel } =
    useRecognizer();
};
