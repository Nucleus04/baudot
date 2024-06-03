const fs = require("fs");
const path = require("path");
const Baudot = require("./Decoder7");

function processWavFiles(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const wavFiles = files.filter(
        (file) => path.extname(file).toLowerCase() === ".wav"
      );

      const outputFileName = path.basename(directoryPath) + ".txt";
      const outputFileStream = fs.createWriteStream(outputFileName);

      function processFile(index) {
        if (index >= wavFiles.length) {
          outputFileStream.end(); // Close the file stream
          resolve(); // All files processed
          return;
        }

        const file = wavFiles[index];
        // console.log(file);
        const filePath = path.join(directoryPath, file);
        const inputFile = fs.createReadStream(filePath, {
          highWaterMark: 20,
        });
        const baudot = new Baudot({
          sampleRate: 8000,
          durationPerDetection: 5,
          code: "US_TTY",
        });
        let output = [];
        // Handle data event
        inputFile.on("data", (chunk) => {
          baudot.write(chunk);
        });

        // Handle end event
        inputFile.on("end", () => {
          baudot._final(); // Required to be invoked to read the last character remaining

          const outputLine = `${file},\n${output.join("")}\n`; // Format the output line

          outputFileStream.write(outputLine); // Write the output line to the file
          // console.log(`Finished processing ${file}`);

          baudot.removeAllListeners(); // Remove listeners to avoid memory leaks
          processFile(index + 1); // Process next file
        });

        // Handle error event
        inputFile.on("error", (err) => {
          reject(err);
        });

        // Handle data event from baudot
        baudot.on("data", (chunk) => {
          console.log(chunk.toString());
          output.push(chunk.toString());
        });
      }

      // Start processing files
      processFile(0);
    });
  });
}

// Example usage:
const directoryPath = "./tty";
processWavFiles(directoryPath)
  .then(() => {
    console.log("All files processed successfully.");
  })
  .catch((err) => {
    console.error("Error:", err);
  });
