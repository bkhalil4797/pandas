import { createContext, useContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";
import { Button, Modal, TextField } from "@material-ui/core";
import LockIcon from "@material-ui/icons/Lock";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import SaveIcon from "@material-ui/icons/Save";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";

export const RecognizerContext = createContext();
export const useRecognizer = () => useContext(RecognizerContext);

export default function RecognizerContextProvider({ children }) {
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
    if (activeRecognizer && activeRecognizer.isListening()) {
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
    if (activeRecognizer && activeRecognizer.isListening()) {
      await activeRecognizer.stopListening();
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
    const transfRec = await loadModel(model);
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
    // pour framesize elle est calculer comme montrer ci dessous
    // frameSize = (1 - overlap ) * 1000
    // donc overlap = 1 - frameSize/1000
    const transfRec = await loadModel(model);
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

  const [newWord, setNewWord] = useState("");
  const [words, setWords] = useState([]);
  const [savedWords, setSavedWords] = useState([]);
  const [unusedSavedWords, setUnusedSavedWords] = useState([]);
  const [countExamples, setCountExamples] = useState([]);
  const [canModify, setCanModify] = useState(false);

  const [modelName, setModelName] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const epochs = 50;

  const initialLoad = async (model) => {
    if (recognizer === undefined) {
      throw new Error("recognizer not loaded yet");
    }
    if (activeRecognizer && activeRecognizer.isListening()) {
      await activeRecognizer.stopListening(); // Promise<void>;
    }
    // remet les state par defaut
    savedModelList.includes(model) ? setCanModify(false) : setCanModify(true);
    setWords([]);
    setNewWord("");
    setCountExamples([]);
    const savedWords = await localforage.keys();
    setSavedWords(savedWords);
    setUnusedSavedWords(savedWords);

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
      setUnusedSavedWords(savedWords);
    }
    setActiveRecognizer(transfRec);
    return transfRec;
  };

  // ajouter un mot au model
  const addWord = async () => {
    if (!canModify) {
      return;
    }
    const word = newWord.trim().toLowerCase();
    setNewWord("");
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

    setWords(words.filter((w) => w !== word));
    if (savedWords.includes(word)) {
      setUnusedSavedWords([...unusedSavedWords, word]);
    }
    try {
      const datasetOfWord = activeRecognizer.getExamples(word);
      for (let index in datasetOfWord) {
        await activeRecognizer.removeExample(datasetOfWord[index].uid);
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

  const enableModify = async () => {
    if (canModify) {
      return;
    }
    let version = Number(
      modelName.substring(modelName.length - 3, modelName.length)
    );
    version = version + 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const newModelName = `${modelName.substring(
      0,
      modelName.length - 5
    )} v${version}`;
    const wordsList = words;
    setModelName(newModelName);
    const transfRec = await initialLoad(newModelName);
    setUnusedSavedWords(unusedSavedWords.filter((w) => !wordsList.includes(w)));
    for (let word of wordsList) {
      await localforage.getItem(word, (err, value) => {
        if (err) {
          console.log(err);
        }
        console.log(`${word} loaded`);
        transfRec.loadExamples(value, false);
      });
    }
    setWords(await transfRec.wordLabels());
    setCountExamples(await transfRec.countExamples());
  };

  const deleteModel = async () => {
    if (!canModify) {
      return;
    }
    if (savedModelList.includes(modelName)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(modelName);
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
    // le cas l'utilisateur click sur modify pour ensuite essayer de supprimer le model
    let version = Number(
      modelName.substring(modelName.length - 3, modelName.length)
    );
    version = version - 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const oldModelName = `${modelName.substring(
      0,
      modelName.length - 5
    )} v${version}`;
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

  const saveModel = async () => {
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
      let version = Number(
        modelName.substring(modelName.length - 3, modelName.length)
      );
      if (version === 1) {
        return;
      } else {
        version = version - 1;
        version = String(version);
        for (let i = version.length; i < 3; i++) {
          version = "0" + version;
        }
        const oldModelName = `${modelName.substring(
          0,
          modelName.length - 5
        )} v${version}`;
        deleteModel(oldModelName);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setModelName("");
    setCanModify(false);
  };

  const createModel = (name) => {
    const formattedName = name.trim().toLowerCase();
    const formatedSavedModel = savedModelList.map((model) =>
      model.substring(0, model.length - 5)
    );
    if (formatedSavedModel.includes(formattedName.toLowerCase())) {
      throw new Error("le modele est existant");
    }
    setModelName(`${formattedName} v001`);
    setOpenModal(true);
    initialLoad(`${formattedName} v001`);
  };

  const modifyModel = (name) => {
    setOpenModal(true);
    setModelName(name);
    initialLoad(name);
  };

  const value = {
    startRecognize,
    oneRecognize,
    stopRecognize,
    savedModelList,
    createModel,
    modifyModel,
    recognizerResult,
  };

  return (
    <RecognizerContext.Provider value={value}>
      {children}
      <Modal
        open={openModal}
        onClose={() => closeModal()}
        className="modal__Container"
      >
        <div className="modal__visible">
          <div>
            <h1>
              Modele :
              {`${modelName.substring(0, 1).toUpperCase()}${modelName.substring(
                1,
                modelName.length - 5
              )}`}
              {canModify ? <LockOpenIcon /> : <LockIcon />}
            </h1>
            <p>Version : {modelName}</p>
          </div>

          <div className="modifymodel__main">
            <div>
              <TextField
                label="Ajouter un mot"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                disabled={!canModify}
              />
              <Button
                variant="outlined"
                disabled={!canModify}
                onClick={addWord}
              >
                <AddCircleOutlineOutlinedIcon />
                Ajouter
              </Button>
            </div>

            <div className="modifymodel__words">
              <div>
                <p>Mot du modele</p>
                {words.length > 0 ? (
                  words.map((word) => (
                    <div key={word}>
                      <Button
                        variant="outlined"
                        onClick={() => collectExample(word)}
                        disabled={!canModify}
                      >
                        {word} ({countExamples[word] ? countExamples[word] : 0})
                      </Button>
                      <Button
                        onClick={() => removeWord(word)}
                        disabled={!canModify}
                      >
                        <HighlightOffIcon />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p>Aucun mot existant</p>
                )}
              </div>
              {canModify && (
                <div>
                  <p>Ajouter un mot déja utilisé</p>
                  {unusedSavedWords.length > 0 ? (
                    unusedSavedWords.map((word) => (
                      <div key={word}>
                        <Button
                          variant="outlined"
                          onClick={() => tranfertWord(word)}
                        >
                          {word}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p>Aucun mot enregistrer</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modifymodel__footer">
            <Button
              variant="outlined"
              disabled={canModify}
              onClick={enableModify}
            >
              <AssignmentTurnedInOutlinedIcon />
              Modifier
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={deleteModel}
            >
              <DeleteForeverIcon />
              Supprimer
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={saveModel}
            >
              <SaveIcon />
              Enregistrer
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={closeModal}
            >
              <CancelOutlinedIcon />
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </RecognizerContext.Provider>
  );
}
