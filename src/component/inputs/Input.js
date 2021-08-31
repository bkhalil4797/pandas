import { TextField } from "@material-ui/core";
import { useRef, useEffect } from "react";
import { useContextProvider } from "../../context";

export const Input = ({ iid }) => {
  const { inputList, setInputList } = useContextProvider();
  const myInput = useRef();
  useEffect(() => {
    if (inputList.length === 0) {
      setInputList([{ id: iid, ref: myInput }]);
    } else {
      const filtered = inputList.filter(({ id }) => id === iid);
      if (filtered.length === 0) {
        setInputList([...inputList, { id: iid, ref: myInput }]);
      }
    }
    // we can make a cleanup fct for when the component unmount the iid leave the
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <TextField ref={myInput} id={iid} />;
};
