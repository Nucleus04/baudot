const fs = require("fs");
const { execSync, spawn } = require("child_process");

class BaudotEncoder {
  /**
   * Creates an instance of BaudotEncoder.
   * @param {Object} props - The properties of the encoder.
   * @param {string} props.code - The Baudot code to encode.
   * @param {number} props.sampleRate - The sample rate.
   */
  constructor(props) {
    this.code = props.code;
    this.sampleRate = props.sampleRate;
    this.currentMapType = "letter";
    this.map = JSON.parse(
      fs.readFileSync(`./codes/${this.code}/${this.currentMapType}.json`)
    );
    this.baudotCodeBuffer = [];
    this.addLetterShift();
  }
  addLetterShift() {
    this.baudotCodeBuffer.push("10000000");
    return;
  }
  addSpaceShift() {
    this.baudotCodeBuffer.push("11101100");
    return;
  }
  async encode(text) {
    this.addSpaceShift();
    let inputText = text.toLowerCase();
    for (let i = 0; i < inputText.length; i++) {
      let code = this.findBaudotCode(inputText[i]);
      if (code) {
        let baudot = this.buildBaudot(code);
        this.baudotCodeBuffer.push(baudot);
      } else {
        this.switchMap();
        let code = this.findBaudotCode(inputText[i]);
        if (code) {
          this.insertShiftCode();
          let baudot = this.buildBaudot(code);
          this.baudotCodeBuffer.push(baudot);
        } else {
          console.log("Current character is not supported");
        }
      }
    }

    const outputAudio = await this.generateTone();
    return outputAudio;
    // if (this.checkForEndKeys()) {
    //   const outputAudio = await this.generateTone();
    //   return outputAudio;
    // }
  }
  checkForEndKeys() {
    if (
      this.baudotCodeBuffer[this.baudotCodeBuffer.length - 1] === "10011100" &&
      this.baudotCodeBuffer[this.baudotCodeBuffer.length - 2] === "11010000"
    ) {
      console.log("end key");
      return true;
    } else if (
      this.baudotCodeBuffer[this.baudotCodeBuffer.length - 1] === "10000100" &&
      this.baudotCodeBuffer[this.baudotCodeBuffer.length - 2] === "10101100"
    ) {
      return true;
    } else {
      return false;
    }
  }
  async generateTone() {
    console.log(this.baudotCodeBuffer);
    return new Promise((resolve, reject) => {
      let input = this.baudotCodeBuffer.join("");
      const output = execSync(
        `python3 tones.py ${input}`.toString()
      ).toString();
      const encoded = Buffer.from(output.trim(), "base64");

      const ffmpeg = spawn(
        "ffmpeg",
        ["-i", "pipe:", "-f", "wav", "-acodec", "pcm_mulaw", "-"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      let baudotAudioBUffer = Buffer.alloc(0);

      ffmpeg.stdin.write(encoded);
      ffmpeg.stdin.end();
      ffmpeg.stdout.on("data", (data) => {
        baudotAudioBUffer = Buffer.concat([baudotAudioBUffer, data]);
      });
      ffmpeg.stderr.on("data", (data) => {
        // console.error(`ffmpeg error: ${data}`);
      });
      ffmpeg.on("close", (code) => {
        if (code === 0) {
          fs.writeFileSync("finalOutput.wav", baudotAudioBUffer);
          console.log("Conversion to pcm_mulaw format completed.");
          this.baudotCodeBuffer = [];
          resolve(baudotAudioBUffer);
        } else {
          // console.error(`ffmpeg process exited with code ${code}`);
        }
      });
    });
  }
  buildBaudot(inputString) {
    let charArray = inputString.split("");
    charArray = charArray.map((char) => {
      return char === "0" ? "1" : "0";
    });
    charArray.reverse();
    let result = charArray.join("");
    result = "1" + result + "00";
    return result;
  }

  insertShiftCode() {
    if (this.currentMapType === "letter") {
      let baudot = this.buildBaudot("11111");
      this.baudotCodeBuffer.push(baudot);
    } else {
      let baudot = this.buildBaudot("11011");
      this.baudotCodeBuffer.push(baudot);
    }
  }
  switchMap() {
    if (this.currentMapType === "letter") {
      this.currentMapType = "figure";
    } else {
      this.currentMapType = "letter";
    }
    this.map = JSON.parse(
      fs.readFileSync(`./codes/${this.code}/${this.currentMapType}.json`)
    );
    return;
  }
  findBaudotCode(letter) {
    for (const binaryString in this.map) {
      if (
        this.map.hasOwnProperty(binaryString) &&
        this.map[binaryString] === letter
      ) {
        return binaryString;
      }
    }
  }
}

module.exports = BaudotEncoder;
