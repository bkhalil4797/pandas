import { useState, useRef } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Popover,
  TextField,
} from "@material-ui/core";

import { useContextProvider } from "../context";

export const Models = () => {
  const {
    savedModelList,
    setAlert,
    setOpenModal,
    setSelectedModel,
    selectedModel,
    recognizer,
  } = useContextProvider();

  /* --------------------------------------------------- */
  /*          Partie bouton creation d'un modele         */
  /* --------------------------------------------------- */
  const [createDialog, setCreateDialog] = useState(false);

  const closeCreateDialog = () => {
    setCreateDialog(false);
    setSelectedModel("");
  };
  const handleCreateDialog = () => {
    const formatedModelName = selectedModel.trim().toLowerCase();
    if (formatedModelName.length < 3) {
      setAlert({
        open: true,
        severity: "warning",
        msg: "Le nom doit contenir en moins 3 charactere ",
      });
      return;
    }
    const formatedSavedModel = savedModelList.map((model) =>
      model.substring(0, model.length - 5)
    );
    if (formatedSavedModel.includes(formatedModelName.toLowerCase())) {
      setAlert({
        open: true,
        severity: "error",
        msg: `le Modele " ${formatedModelName} " est déja existant`,
      });
      return;
    }
    setSelectedModel(`${formatedModelName} v001`);
    setCreateDialog(false);
    setOpenModal(true);
  };

  /* --------------------------------------------------- */
  /*           Partie bouton modifier un modele          */
  /* --------------------------------------------------- */
  const [openPopover, setOpenPopover] = useState(false);
  const popoverButtonRef = useRef();

  const handleModifyModel = (model) => {
    setSelectedModel(model);
    setOpenPopover(false);
    setOpenModal(true);
  };

  return (
    <>
      {/* --------------------------------------------------- */}
      {/*         Partie visuelle (ce qui est afficher)       */}
      {/* --------------------------------------------------- */}

      <div className="container">
        <h1>Modeles</h1>
        <Button
          variant="outlined"
          color="default"
          onClick={() => setCreateDialog(true)}
          disabled={recognizer === undefined ? true : false}
        >
          Creer un modele
        </Button>
        <Button
          ref={popoverButtonRef}
          variant="outlined"
          color="default"
          onClick={() => setOpenPopover(true)}
          disabled={recognizer === undefined ? true : false}
        >
          Modifier un modele
        </Button>
      </div>

      {/* --------------------------------------------------- */}
      {/*          Partie bouton creation d'un modele         */}
      {/* --------------------------------------------------- */}

      <Dialog
        open={createDialog}
        onClose={closeCreateDialog}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle>Creation d'un modele</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le nom du modele ne doit pas etre utilisé et doit contenir en moins
            3 charactere
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du modele"
            fullWidth
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={closeCreateDialog}>
            Annuler
          </Button>
          <Button color="primary" onClick={handleCreateDialog}>
            valider
          </Button>
        </DialogActions>
      </Dialog>

      {/* --------------------------------------------------- */}
      {/*           Partie bouton modifier un modele          */}
      {/* --------------------------------------------------- */}

      <Popover
        open={openPopover}
        onClose={() => setOpenPopover(false)}
        anchorEl={popoverButtonRef.current}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <div className="container popover">
          {savedModelList.length === 0 ? (
            <p>Il n{"'"}y a pas de modele enregistrer</p>
          ) : (
            savedModelList.map((model) => (
              <Button
                variant="outlined"
                color="default"
                key={model}
                onClick={() => handleModifyModel(model)}
              >
                {model.substring(0, model.length - 5)}
              </Button>
            ))
          )}
        </div>
      </Popover>
    </>
  );
};
