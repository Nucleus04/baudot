const fs = require("fs");
const Baudot = require("./Decoder6");
const { spawn } = require("child_process");

let delay = 0;

const ffmpegArgs = [
  "-f",
  "mulaw",
  "-ar",
  "8000",
  "-i",
  "pipe:0",
  "-af",
  "compand=attacks=0:points=-30/-15|-1/-15|0/-3:gain=1",
  "-f",
  "mulaw",
  "-ar",
  "8000",
  "pipe:1",
];

const ffmpegProccess = spawn("ffmpeg", ffmpegArgs);

ffmpegProccess.stdout.on("data", function (chunk) {
  baudot.write(chunk);
});
ffmpegProccess.stdout.on("end", function () {
  baudot._final();
});

const file = fs.createReadStream(
  // "./tty/+17035960046-+18559215457-CA4e3727f4b19acb480a0df4fa3c6dda89.wav",
  // "./tty/+17035960046-+18559215457-CA5d52e76d069b76c8e83e446b120bd4e9.wav",
  // "./tty/+17035960046-+18559215457-CA9af64b43866708d681101772ef2d3f7d.wav",
  // "./tty/+17035960046-+18559215457-CA298e98fe502865c3d2246ee57db437eb.wav",
  // "./tty/+17035960046-+18559215457-CAbb652717ea69d475a44b689faabd973a.wav",
  // "./tty/+17035960046-+18559215457-CAff7e7c1f883f316e5e0968081db58fdb.wav",
  // "./tty/normalized.wav",
  // "./tty/output.wav",
  // "./911.wav",
  // "./finalOutput.wav",
  "hi_angeltty.wav",
  {
    highWaterMark: 20,
  }
);

const baudot = new Baudot({
  sampleRate: 8000,
  durationPerDetection: 5,
  code: "US_TTY",
});

process.stdout.write("\n");
file.on("data", (chunk) => {
  ffmpegProccess.stdin.write(chunk);
  // baudot.write(chunk);
});

file.on("end", () => {
  ffmpegProccess.stdin.end();
  // baudot._final();
  // setTimeout(() => {
  //   baudot._final();
  //   process.stdout.write("\n");
  // }, delay + 1000);
});

baudot.on("data", (chunk) => {
  process.stdout.write(chunk.toString());
});
