const BaudotEncoder = require("./BaudotEncoder2");

const baudot = new BaudotEncoder({
  code: "US_TTY",
  sampleRate: 8000,
});

console.log("Enter the text to encode:");

process.stdin.on("data", async (input) => {
  const inputText = input.toString().trim();
  let buffer = baudot.encode(inputText);
  console.log(buffer);
});
