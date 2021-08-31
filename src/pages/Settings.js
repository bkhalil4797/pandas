import { useEffect } from "react";

export const Settings = () => {
  useEffect(() => {
    let msg = new SpeechSynthesisUtterance(
      "Vous étes sur la page des parametres"
    );
    const voices = speechSynthesis.getVoices();
    msg.voice = voices[9];
    window.speechSynthesis.speak(msg);
    msg = new SpeechSynthesisUtterance("Merci d'avoir utilisé notre service");
    msg.voice = voices[9];
    window.speechSynthesis.speak(msg);
    console.log(window.speechSynthesis.getVoices());
  }, []);
  return (
    <>
      <h1>Settings</h1>
    </>
  );
};
