const fs = require("fs");
const Decoder = require("./Decoder8");

const file = fs.createReadStream(
  //   "./tty/+17035960046-+18559215457-CA4e3727f4b19acb480a0df4fa3c6dda89.wav",
  //   "./tty/+17035960046-+18559215457-CA5d52e76d069b76c8e83e446b120bd4e9.wav",
  // "./tty/+17035960046-+18559215457-CA9af64b43866708d681101772ef2d3f7d.wav",
  // "./tty/+17035960046-+18559215457-CA298e98fe502865c3d2246ee57db437eb.wav",
  // "./tty/+17035960046-+18559215457-CAbb652717ea69d475a44b689faabd973a.wav",
  // "./tty/+17035960046-+18559215457-CAff7e7c1f883f316e5e0968081db58fdb.wav",
  // "./tty/normalized.wav",
  // "./tty/output.wav",
  //   "./tty/911.wav",
  "./tty/finalOutput.wav",
  // "./tty/hi_angeltty.wav",
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
