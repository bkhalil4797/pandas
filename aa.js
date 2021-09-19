const { spawn } = require("child_process");
module.exports = function (callback) {
  const react = spawn("yarn start", [], {
    env: {
      HTTPS: true,
      SSL_CRT_FILE: "./cert/cert.crt",
      SSL_KEY_FILE: "./cert/cert.key",
    },
    shell: true,
  });
  react.stdout.on("data", (buffer) => console.log(buffer.toString()));
  react.stderr.on("data", (buffer) => console.error(buffer.toString()));
  react.on("close", (code) =>
    callback("React server exited with code " + code)
  );
};
