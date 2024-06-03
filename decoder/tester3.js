const fs = require("fs");
const Baudot = require("./Decoder7");
const { spawn } = require("child_process");

let delay = 0;

function volumeManager() {
  const command = spawn("ffmpeg", [
    "-f",
    "mulaw",
    "-ar",
    "8000",
    "-i",
    "pipe:0",
    "-filter:a",
    "volume=-16.7dB",
    "-f",
    "mulaw",
    "pipe:1",
  ]);
  command.stderr.on("data", (data) => {
    console.error(`ffmpeg error: ${data}`);
    // Handle stderr data if needed
  });

  command.stdout.on("data", (chunk) => {
    console.log(chunk);
    //   console.log(chunk.length);
    baudot.write(chunk);
  });

  command.stdout.on("end", () => {
    baudot._final();
    // Handle end of stdout if needed
  });

  return command.stdin;
}

const ffmpegArgs = [
  "-f",
  "mulaw", // Specify the input format as mu-law
  "-ar",
  "8000", // Set the audio sample rate
  // '-ac', '1',     // Set the number of audio channels (1 for mono)
  "-i",
  "pipe:0", // Use stdin as input
  "-af",
  "compand=attacks=0:points=-30/-15|-1/-15|0/-3:gain=1", // Apply the compand filter
  "-f",
  "mulaw", // Specify the output format as mu-law
  "-ar",
  "8000", // Set the output audio sample rate
  // '-ac', '1',     // Set the number of output audio channels (1 for mono)
  "pipe:1", // Output to stdout
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
  "./911.wav",
  {
    highWaterMark: 1000,
  }
);
const baudot = new Baudot({
  sampleRate: 8000,
  durationPerDetection: 5,
  code: "US_TTY",
});

process.stdout.write("\n");
file.on("data", (chunk) => {
  setTimeout(() => {
    // volumeManager().write(chunk);
    baudot.write(chunk);
    // ffmpegProccess.stdin.write(chunk);
  }, delay);
  delay = delay + 20;
});

file.on("end", () => {
  setTimeout(() => {
    baudot._final(); //required to invoked to read the last character remaning
    // respond(); //Automate reponse by reading another baudot wav
    process.stdout.write("\n");
  }, delay + 1000);
});
baudot.on("data", (chunk) => {
  process.stdout.write(chunk.toString());
});

// ffmpeg command

// ffmpeg -i +17035960046-+18559215457-CAff7e7c1f883f316e5e0968081db58fdb.wav -af loudnorm=I=-16:TP=-9.0:LRA=11:measured_I=-12.88:measured_TP=-1.27:measured_LRA=13.30:measured_thresh=-23.02:offset=-3.56:linear=true -ar 8000 -c:a pcm_mulaw normalized2.wav
// ffmpeg -i +17035960046-+18559215457-CAff7e7c1f883f316e5e0968081db58fdb.wav -af "dynaudnorm=p=0.9:m=10:s=1:g=15, loudnorm=I=-16:TP=-10.0:LRA=11:linear=true" -ar 8000 -c:a pcm_mulaw normalized.wav

// ffmpeg -i +17035960046-+18559215457-CAff7e7c1f883f316e5e0968081db58fdb.wav -af "compand=attacks=0:points=-30/-15|-1/-15|0/-3:gain=1" -ar 8000 -c:a pcm_mulaw normalized.wav
