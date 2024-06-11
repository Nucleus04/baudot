const fs = require("fs");
const Decoder = require("./Decoder11");

const file = fs.createReadStream(
  // "./audio/+14084137128-+18559215457-CA2e9f588ea5c4d6fc742751408ae9c4f4.wav",
  "./audio/+14084137128-+18559215457-CAc199814c6c7e4d43ff9477442bc95e5f.wav",
  // "./audio/+16462068146-+18559225311-CA5f69b12ffdef97c7c866c17cf1ce0a12.wav",
  // "./audio/+16462068146-+18559225311-CA85ed5491575d6e7ae0a7a2a700f4c978.wav",
  {
    highWaterMark: 20,
  }
);

const decode = new Decoder();

file.on("data", (chunk) => {
  decode.feed(chunk);
});

file.on("end", () => {
  decode.end();
});

decode.on("character", (char) => {
  console.log(char);
});

decode.on("error", (err) => {
  console.log(err);
});
