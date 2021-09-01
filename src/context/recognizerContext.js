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
      return updatedModel[0];
    }
    return model;
  };

  //helper fct
  const loadModel = async (model) => {
    if (!savedModelList.includes(model)) {
      throw new Error("Le model n'existe pas");
    }
    if (recognizer === undefined) {
      throw new Error("recognizer not loaded yet");
    }
    if (activeRecognizer.isListening()) {
      await activeRecognizer.stopListening(); // Promise<void>;
    }
    const isUsed = cachedModel.filter((obj) => obj.name === model);
    let transfRec;
    if (isUsed.length > 0) {
      transfRec = isUsed[0].model;
    } else {
      transfRec = recognizer.createTransfer(model);
      await transfRec.load(); // Promise<void>;
      setCachedModel([...cachedModel, { name: model, model: transfRec }]);
    }
    setActiveRecognizer(transfRec);
    return transfRec;
  };

  const stopRecognize = async () => {
    if (activeRecognizer.isListening()) {
      activeRecognizer.stopListening();
    }
  };

  // return in recognizerResult state
  const startRecognize = (model, duree, overlap = 0.5) => {
    if (overlap > 1 || overlap < 0) {
      throw new Error("bad value for overlap");
    }
    if (duree <= 0) {
      throw new Error("bad value for duree");
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
  const oneRecognize = (model, overlap = 0.5) => {
    // pour framesize elle est calculer comme montrer ci dessous
    // frameSize = (1 - overlap ) * 1000
    // donc overlap = 1 - frameSize/1000
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

  /*------------------------------------------------------------------*/
  /*------------------Partie Manipulation de modele-------------------*/
  /*------------------------------------------------------------------*/

  const [words, setWords] = useState([]);
  const [savedWords, setSavedWords] = useState([]);
  const [unusedSavedWords, setUnusedSavedWords] = useState([]);
  const [countExamples, setCountExamples] = useState([]);
  const [canModify, setCanModify] = useState(false);

  const epochs = 50;

  const initialLoad = async (model) => {
    if (recognizer === undefined) {
      throw new Error("recognizer not loaded yet");
    }
    if (activeRecognizer.isListening()) {
      await activeRecognizer.stopListening(); // Promise<void>;
    }
    // remet les state par defaut
    savedModelList.includes(model) ? setCanModify(false) : setCanModify(true);
    setWords([]);
    setCountExamples([]);
    const savedWords = await localforage.keys();
    setSavedWords(savedWords);

    const isUsed = cachedModel.filter((obj) => obj.name === model);
    let transfRec;
    if (isUsed.length > 0) {
      transfRec = isUsed[0].model;
      const words = await transfRec.wordLabels();
      if (words !== null) {
        setWords(words);
        setUnusedSavedWords(savedWords.filter((w) => !words.includes(w)));
        try {
          setCountExamples(await transfRec.countExamples());
        } catch (err) {
          console.log(err);
          console.log("initial load cout exemple error 'nothing to worry'");
        }
      }
    } else if (savedModelList.includes(model)) {
      transfRec = recognizer.createTransfer(model);
      await transfRec.load();
      setCachedModel([...cachedModel, { name: model, model: transfRec }]);
      const words = await transfRec.wordLabels();
      setWords(words);
      setUnusedSavedWords(savedWords.filter((w) => !words.includes(w)));
    } else {
      transfRec = recognizer.createTransfer(model);
      setCachedModel([...cachedModel, { name: model, model: transfRec }]);
    }
    setActiveRecognizer(transfRec);
    return transfRec;
  };

  // ajouter un mot au model
  const addWord = async (word) => {
    if (!canModify) {
      return;
    }
    word = word.trim().toLowerCase();
    if (word.length === 0) {
      throw new Error("a word can't be empty string");
    } else if (words.includes(word)) {
      return; // it already exist so do nothing
    } else if (savedWords.includes(word)) {
      await localforage.getItem(word, (err, value) => {
        if (err) {
          console.log(err);
        }
        activeRecognizer.loadExamples(value, false);
      });
      setUnusedSavedWords(unusedSavedWords.filter((w) => w !== word));
      setWords([...words, word]);
      setCountExamples(await activeRecognizer.countExamples());
      return;
    } else {
      setWords([...words, word]);
    }
  };
  // enlever un mot (sa devrai plus buger lah nrmlment)
  const removeWord = async (word) => {
    if (!canModify) {
      return;
    }
    try {
      const datasetOfWord = activeRecognizer.getExamples(word);
      for (let index in datasetOfWord) {
        await activeRecognizer.removeExample(datasetOfWord[index].uid);
      }
      setWords(words.filter((w) => w !== word));
      if (savedWords.includes(word)) {
        setUnusedSavedWords([...unusedSavedWords, word]);
      }
    } catch (err) {
      console.log(err);
      throw new Error("ERREUR REMOVEWORD");
    }
  };
  // collect d'exemple d'un mot ----OK
  const collectExample = async (word) => {
    if (!canModify) {
      return;
    }
    try {
      await activeRecognizer.collectExample(word);
      setCountExamples(await activeRecognizer.countExamples());
    } catch (err) {
      console.log(err);
    }
  };
  // ajouter un mot sauvegarder au modele
  const tranfertWord = async (word) => {
    if (!canModify) {
      return;
    }
    await localforage.getItem(word, (err, value) => {
      if (err) {
        throw new Error("can't add the word");
      }
      activeRecognizer.loadExamples(value, false);
    });
    setUnusedSavedWords(unusedSavedWords.filter((w) => w !== word));
    setWords([...words, word]);
    setCountExamples(await activeRecognizer.countExamples());
  };

  const modifyModel = async (model) => {
    if (canModify) {
      return;
    }
    let version = Number(model.substring(model.length - 3, model.length));
    version = version + 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const newModelName = `${model.substring(0, model.length - 5)} v${version}`;
    const wordsList = words;
    const transfRec = initialLoad(newModelName);
    setUnusedSavedWords(
      unusedSavedWords.filter((w) => !wordsList.includes(words))
    );
    for (let word of wordsList) {
      await localforage.getItem(word, (err, value) => {
        if (err) {
          console.log(err);
        }
        console.log(`${word} loaded`);
        transfRec.loadExamples(value, false);
      });
    }
    setCountExamples(await transfRec.countExamples());
  };

  const deleteModel = async (model) => {
    if (!canModify) {
      return;
    }
    if (savedModelList.includes(model)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(model);
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
    // le cas l'utilisateur click sur modify pour ensuite essayer de supprimer le model
    let version = Number(model.substring(model.length - 3, model.length));
    version = version - 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const oldModelName = `${model.substring(0, model.length - 5)} v${version}`;
    if (savedModelList.includes(oldModelName)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(oldModelName);
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
    loadSavedModels();
  };

  const saveModel = async (model) => {
    if (!canModify) {
      return;
    }
    try {
      await activeRecognizer.train({
        epochs,
        callback: {
          onEpochEnd: async (epoch, logs) => {
            console.log(
              `Epoch ${epoch}: loss=${logs.loss}, accuracy=${logs.acc}`
            );
          },
        },
      });
      await activeRecognizer.save();
      // dans le cas ou il y a des mot sans exemple il seront enlever
      const wordList = activeRecognizer.wordLabels();
      setWords(wordList);
      for (let word of wordList) {
        const serialized = activeRecognizer.serializeExamples(word);
        localforage.setItem(word, serialized).then(console.log(`${word} done`));
      }
      // then if we modify a model we will delete the old since we have this now
      let version = Number(model.substring(model.length - 3, model.length));
      if (version === 1) {
        return;
      } else {
        version = version - 1;
        version = String(version);
        for (let i = version.length; i < 3; i++) {
          version = "0" + version;
        }
        const oldModelName = `${model.substring(
          0,
          model.length - 5
        )} v${version}`;
        deleteModel(oldModelName);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const value = {
    startRecognize,
    oneRecognize,
    stopRecognize,
    updateModelName,
    loadSavedModels,
    loadModel,
    initialLoad,
    addWord,
    removeWord,
    collectExample,
    tranfertWord,
    modifyModel,
    deleteModel,
    saveModel,
  };

  return (
    <RecognizerContext.Provider value={value}>
      {children}
    </RecognizerContext.Provider>
  );
};
