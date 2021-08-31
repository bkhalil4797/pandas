import { createContext, useContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";

const RecognizerContext = createContext();
export const useRecognizer = () => useContext(RecognizerContext);

export const RecognizerContextProvider = ({ children }) => {
  const [recognizer, setRecognizer] = useState();
  const [activeRecognizer, setActiveRecognizer] = useState();
  const [savedModelList, setSavedModelList] = useState([]);
  const [cachedModel, setCachedModel] = useState([]);
  const [recognizerResult, setRecognizerResult] = useState([]);

  const loadRecognizer = async () => {
    let recognizer = SpeechCommands.create("BROWSER_FFT");
    await recognizer.ensureModelLoaded();
    setRecognizer(recognizer);
    console.log(`Google Model Loaded`);
  };

  const loadSavedModels = async () => {
    const savedModelKeys = await SpeechCommands.listSavedTransferModels();
    setSavedModelList(savedModelKeys);
  };

  useEffect(() => {
    localforage.config({
      driver: localforage.INDEXEDDB,
      name: "SpeechCommand", // db name
      storeName: "SavedWords", // table name
      description: "Speech Command Serialized Exemples", //table description
    });
    loadRecognizer();
    loadSavedModels();
  }, []);

  // dans le cas ou on a une nouvelle version pour un même model
  const updateModelName = (model) => {
    if (!savedModelList.includes(model)) {
      const updatedModel = savedModelList.filter(
        (models) =>
          models.substring(0, models.length - 5) ===
          model.substring(0, models.length - 5)
      )[0];
      return updatedModel;
    }
    return model;
  };

  //helper fct
  const loadModel = async (model) => {
    if (!savedModelList.includes(model)) {
      throw new Error("Le model n'existe pas");
    }
    const isUsed = cachedModel.filter((obj) => obj.name === model);
    let transfRec;
    if (isUsed.length > 0) {
      transfRec = isUsed[0].model;
    } else {
      transfRec = recognizer.createTransfer(model);
      await transfRec.load(); // Promise<void>;
    }
    setActiveRecognizer(transfRec);
    setCachedModel([...cachedModel, { name: model, model: transfRec }]);
    return transfRec;
  };

  const stopRecognize = async () => {
    if (activeRecognizer.isListening()) {
      activeRecognizer.stopListening();
    }
  };

  // return in recognizerResult state
  const startRecognize = async (model, duree, overlap = 0.5) => {
    if (overlap > 1 || overlap < 0) {
      throw new Error("bad value for overlap");
    }
    if (duree <= 0) {
      throw new Error("bad value for duree");
    }
    if (recognizer === undefined) {
      throw new Error("recognizer not loaded yet");
    }
    if (activeRecognizer.isListening()) {
      await activeRecognizer.stopListening(); // Promise<void>;
    }
    const transfRec = loadModel(model);
    transfRec.listen(
      ({ scores }) => {
        const words = transfRec.wordLabels();
        scores = Array.from(scores).map((s, i) => ({
          score: s,
          word: words[i],
        }));
        scores.sort((s1, s2) => s2.score - s1.score);
        setRecognizerResult([...recognizerResult, scores]);
      },
      {
        overlapFactor: overlap,
        includeSpectrogram: true,
        probabilityThreshold: 0.9,
        invokeCallbackOnNoiseAndUnknown: true,
      }
    );
    if (duree) {
      setTimeout(() => {
        stopRecognize();
      }, duree * 1000);
    }
  };

  // return an ordred array of recognized word
  const oneRecognize = async (model, overlap = 0.5) => {
    if (recognizer === undefined) {
      throw new Error("recognizer not loaded yet");
    }
    if (activeRecognizer.isListening()) {
      await activeRecognizer.stopListening(); // Promise<void>;
    }
    const transfRec = loadModel(model);
    transfRec.listen(
      ({ scores }) => {
        const words = transfRec.wordLabels();
        scores = Array.from(scores).map((s, i) => ({
          score: s,
          word: words[i],
        }));
        scores.sort((s1, s2) => s2.score - s1.score);
        transfRec.stopListening(); //state are async so we can't use activeRecognizer
        return scores;
      },
      {
        overlapFactor: overlap,
        includeSpectrogram: true,
        probabilityThreshold: 0.9,
        invokeCallbackOnNoiseAndUnknown: true,
      }
    );
  };

  const value = {
    startRecognize,
    oneRecognize,
    stopRecognize,
    updateModelName,
  };

  return (
    <RecognizerContext.Provider value={value}>
      {children}
    </RecognizerContext.Provider>
  );
};
