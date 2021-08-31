import { useEffect } from "react";

export const Settings = () => {
  const voicetest = async () => {
    let msg = await syntheseVocal;

    msg.text = "Vous étes sur la page des parametres";

    speechSynthesis.speak(msg);

    msg.text = "Merci d'avoir utilisé notre service";
    window.speechSynthesis.speak(msg);
  };
  const syntheseVocal = new Promise((resolve, reject) => {
    let msg = new SpeechSynthesisUtterance("");
    msg.lang = "fr-FR";
    resolve(msg);
  });
  useEffect(() => {
    voicetest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <h1>Settings</h1>
    </>
  );
};
