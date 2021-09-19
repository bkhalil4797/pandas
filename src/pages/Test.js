import React from "react";
import { RecognizerContext } from "../context/speechCommand";

export const Test = () => {
  const {
    modifyModel,
    recognize,
    stopRecognize,
    recognizerResult,
    openSavedWordModal,
    savedModelList,
  } = React.useContext(RecognizerContext);

  const [modelName, setModelName] = React.useState("");
  const [recommendedWord, setRecommendedWords] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState("");

  return (
    <>
      <div>
        Mot Recommender sous la form de :
        PremierMot,DeuxiemeMot,TroisiemeMot,.....
        <input
          value={recommendedWord}
          onChange={(e) => setRecommendedWords(e.target.value.toLowerCase())}
        />
      </div>
      <hr />

      <div>
        Creer un modele
        <input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        />
        <button
          onClick={() =>
            modifyModel(
              modelName,
              recommendedWord.length === 0 ? [] : recommendedWord.split(",")
            )
          }
        >
          Creer
        </button>
      </div>
      <hr />
      <div>
        Modifier un modele
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="0">Aucun modele disponible</option>

          {savedModelList.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            modifyModel(
              selectedModel,
              recommendedWord.length === 0 ? [] : recommendedWord.split(",")
            )
          }
        >
          Modifier
        </button>
      </div>
      <hr />
      <div>
        Modifier un modele
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="0">Aucun modele disponible</option>

          {savedModelList.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <button onClick={() => recognize(selectedModel, 60, false)}>
          start recognize
        </button>
        <button onClick={() => stopRecognize()}>stop recognize</button>
      </div>
      <hr />
      <div>
        <button onClick={() => openSavedWordModal()}>delete saved words</button>
      </div>
      <hr />
      <div>
        Resultat de la reconnaissance :{" "}
        {recognizerResult.length > 0 &&
          recognizerResult.map((resultArray) => (
            <div>JSON.stringify(resultArray)</div>
          ))}
      </div>
    </>
  );
};
