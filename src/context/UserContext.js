import { useReducer, createContext, useContext } from "react";

const initialState = {
  id: null,
  username: null,
  connected: false,
};

const reducer = (state, action) => {
  const { type } = action;
  switch (type) {
    case "LOGIN":
      return { ...state, connected: true, username: "anonyme", id: 1 };
    case "LOGOUT":
      return { ...state, connected: false, username: null, id: null };

    default:
      return state;
  }
};

const UserContext = createContext();

export const useUserContextProvider = () => useContext(UserContext);

export const UserContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
