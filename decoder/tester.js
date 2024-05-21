const fs = require("fs");
const Baudot = require("./Decoder5");

/**
 * Usecase one
 * using pipe
 */

// const baudot = new Baudot({
//   sampleRate: 8000,
//   durationPerDetection: 5,
//   code: "US_TTY",
// });
// const file = fs.createReadStream("./test.wav");
// // const file = fs.createReadStream("aaaaa.wav");
// file.pipe(baudot);

// baudot.on("data", (chunk) => {
//   process.stdout.write(chunk.toString());
// });

// baudot.on("end", () => {
//   console.log("Nice one!!");
// });

/**
 * Usecase 2 - with delay on transmision and limited amount of chunk
 * using ".write"
 */

let delay = 0;

const file = fs.createReadStream("./563.wav", {
  highWaterMark: 1000,
});
const baudot = new Baudot({
  sampleRate: 8000,
  durationPerDetection: 5,
  code: "US_TTY",
});

process.stdout.write("\n");
file.on("data", (chunk) => {
  setTimeout(() => {
    baudot.write(chunk);
  }, delay);
  delay = delay + 20;
});

file.on("end", () => {
  setTimeout(() => {
    baudot._final(); //required to invoked to read the last character remaning
    // respond(); //Automate reponse by reading another baudot wav
    process.stdout.write("\n");
  }, delay);
});
baudot.on("data", (chunk) => {
  process.stdout.write(chunk.toString());
});

// function respond() {
//   process.stdout.write("\n\nCaller : ");
//   const decoder = new Baudot({
//     sampleRate: 8000,
//     durationPerDetection: 5,
//     code: "US_TTY",
//   });
//   const file2 = fs.createReadStream("912.wav", { highWaterMark: 160 });
//   let delay2 = 20;
//   file2.on("data", (chunk) => {
//     setTimeout(() => {
//       decoder.write(chunk);
//     }, delay2);
//     delay2 = delay2 + 20;
//   });

//   decoder.on("data", (chunk) => {
//     process.stdout.write(chunk.toString());
//   });

//   file2.on("end", () => {
//     setTimeout(() => {
//       decoder._final();
//       process.stdout.write("\n");
//     }, delay2);
//   });
// }
