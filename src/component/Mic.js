import MicOffIcon from "@material-ui/icons/MicOff";
import MicIcon from "@material-ui/icons/Mic";
import { useState } from "react";

export const Mic = (onClick = () => {}) => {
  const [state, setState] = useState(false);
  const handleClick = (e) => {
    e.preventDefault();
    setState(!state);
  };
  return (
    <div onClick={handleClick}>
      {state ? (
        <MicIcon className="micOn" />
      ) : (
        <MicOffIcon className="micOff" />
      )}
    </div>
  );
};
