import { useEffect, useState } from "react";
import { useContextProvider } from "../context";
import { MicPage } from "./MicPage";
// import { useUserContextProvider } from "../context/UserContext";

export const ActionListner = () => {
  const { recResult } = useContextProvider();
  // const { state, dispatch } = useUserContextProvider();
  const [print, setPrint] = useState("");

  const actions = () => {
    switch (recResult) {
      case "logout":
        setPrint(recResult);
        return;
      case "login":
        setPrint(recResult);
        return;
      case "yes":
        setPrint(recResult);
        return;
      case "no":
        setPrint(recResult);
        return;
      case "oui":
        setPrint(recResult);
        return;
      case "non":
        setPrint(recResult);
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    actions();
    console.log(recResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recResult]);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <MicPage id="global" />
      <p style={{ marginLeft: "20px" }}>
        {" "}
        "actions" : {print === "" ? "aucune" : print}
      </p>
    </div>
  );
};
