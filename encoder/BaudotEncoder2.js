const fs = require("fs");
// const { execSync, spawn } = require("child_process");
const header = require("waveheader");

const DURATION = 0.02;
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
  encode(text) {
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

    const outputAudio = this.generate();
    return outputAudio;
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
  generate() {
    let allSamples = [];
    let input = this.baudotCodeBuffer.join("");
    console.log(input);

    for (let i = 0; i < input.length; i++) {
      let sample = this.generateBaudotTone(input[i]);
      allSamples = allSamples.concat(sample);
    }
    const outputFile = "finalOutput.wav";
    const wavData = header(allSamples.length, {
      bitDepth: 8,
      sampleRate: this.sampleRate,
      channels: 1, // Mono audio
    });
    const pcmData = new Uint8Array(allSamples.map((sample) => sample + 128));
    const buffer = Buffer.concat([Buffer.from(wavData), Buffer.from(pcmData)]);
    fs.writeFileSync(outputFile, buffer);

    return pcmData;
  }
  generateBaudotTone(binaryDigit) {
    const markFrequency = 1800;
    const spaceFrequency = 1400;

    const numSamples = Math.ceil(DURATION * this.sampleRate);
    const tones = [];

    for (let i = 0; i < numSamples; i++) {
      const t = i / this.sampleRate;
      const angle =
        2 *
        Math.PI *
        (binaryDigit === "1" ? markFrequency : spaceFrequency) *
        t;
      const sample = Math.sin(angle) * 127;
      tones.push(sample);
    }

    return tones;
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
