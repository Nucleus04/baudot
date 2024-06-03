const fs = require("fs");
// const map = JSON.parse(fs.readFileSync(`./codes/${this.ttyCode}/letter.json`));
const { Transform } = require("stream");
const { spawn } = require("child_process");

const BAUDOT_BYTE_LENGTH = 7;
const HIGH_FREQUENCY_REFERENCE = 1800;
const LOW_FREQUENCY_REFERENCE = 1400;

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

class Baudot extends Transform {
  /**
   * Creates an instance of BaudotDecoder.
   * @param {Object} props - The properties for configuring the BaudotDecoder.
   * @param {number} props.sampleRate - The sample rate of the audio stream.
   * @param {number} props.durationPerDetection - The duration per detection of frequency in milliseconds. 5 create the most accurate decoding.
   * @param {number} props.code - TTY code use for decoding , example (US_TTY)
   */
  constructor(props) {
    super();
    this.ttyCode = props.code;
    this.counterDivisor = 20 / props.durationPerDetection;
    this.sampleRate = props.sampleRate;
    this.map = JSON.parse(
      fs.readFileSync(`./codes/${this.ttyCode}/letter.json`)
    );
    this.durationPerDetection = props.durationPerDetection;
    this.chunkSize = this.calculateChunkSize(
      props.sampleRate,
      props.durationPerDetection
    );
    this.counter = 0;
    this.tempByteHolder = "";
    this.totalByte = 0;
    this.isStart = false;
    this.isHeaderChecking = false;
    this.currentFrequency = null;
    this.frequencyCounter = 0;
    this.isFirstCheck = true;
    this.frequencyBuffer = [];
    this.startTimer = 0;
    this.buffer = null;
    this.isStreamStarted = false;
    this.zeroFrequencyCounter = 0;
    this.ffmpegNormalize = spawn("ffmpeg", ffmpegArgs);
    this.ffmpegListeners();
  }

  /**
   * 2. This function is will normalize the audio chunks volume and set the
   * output to buffer which will be consumed by the startDecoding function.
   */
  ffmpegListeners() {
    this.ffmpegNormalize.stdout.on("data", (chunk) => {
      if (!this.isStreamStarted) {
        this.buffer = chunk;
        this.isStreamStarted = true;
      } else {
        this.buffer = Buffer.concat([this.buffer, chunk]);
      }
    });
    this.ffmpegNormalize.stderr.on("data", (data) => {
      //   this.push(data);
    });
    this.ffmpegNormalize.on("close", (code) => {
      //   this.push(null);
    });
  }

  /**
   * 3. This function will get the stored normalized chunks on buffer , slice it based on chunk size,
   * update the current buffer then pass the sliced chunk to detect function.
   */
  startDecoding() {
    while (this.buffer && this.chunkSize <= this.buffer.length) {
      let inputBuffer = this.buffer.slice(0, this.chunkSize);
      this.buffer = this.buffer.slice(this.chunkSize);
      this.detect(inputBuffer);
    }
  }

  /**
   * 1. this function will listen for incoming input chunks then
   * it will pass the chunks to the ffmpegNormalize function to normalize the volume
   * then it will also start the startDecoding function.
   * @param {*} chunk
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(chunk, encoding, callback) {
    this.ffmpegNormalize.stdin.write(chunk);
    this.startDecoding();
    callback();
  }
  _final() {
    this.ffmpegNormalize.stdin.end();
    if (this.frequencyCounter > this.counterDivisor) {
      this.frequencyCounter = this.frequencyCounter + this.counterDivisor;

      this.proccessStoredFrequency();
    }
  }
  reset() {
    this.counter = 0;
    this.tempByteHolder = "";
    this.totalByte = 0;
    this.isStart = false;
    this.isHeaderChecking = false;
    this.currentFrequency = null;
    this.frequencyCounter = 0;
    this.isFirstCheck = true;
    this.frequencyBuffer = [];
    this.startTimer = 0;
    this.buffer = null;
    this.isStreamStarted = false;
    this.zeroFrequencyCounter = 0;
    return;
  }

  detect(chunk) {
    const audioData = Array.from(chunk, (byte) => byte / 128 - 1);
    const frequency = this.calculateFrequency(audioData);
    if (frequency != 0) {
      const isValidFrequency = this.isValidFrequency(frequency);
      if (isValidFrequency) {
        this.frequencyBuffer.push(frequency);
        if (this.isFirstCheck) {
          this.firstCheck();
          this.setCurrentFrequencyLevel(frequency);
        } else {
          const isFrequencyChange = this.checkFrequencyChange(frequency);
          if (isFrequencyChange) {
            this.proccessStoredFrequency();
            this.setCurrentFrequencyLevel(frequency);
            this.frequencyCounter = 1;
          } else {
            this.frequencyCounter++;
          }
        }
      } else {
        // console.log("Incompatible frequency", frequency);
      }
    }
  }

  isValidFrequency(frequency) {
    if (
      frequency >= HIGH_FREQUENCY_REFERENCE ||
      (frequency <= LOW_FREQUENCY_REFERENCE && frequency >= 800)
    )
      return true;
    return false;
  }

  firstCheck() {
    this.isFirstCheck = false;
    this.frequencyCounter++;
    this.isHeaderChecking = true;
    return;
  }
  skipCarrierTone() {
    this.startTimer = this.startTimer + this.durationPerDetection;
    if (this.startTimer == 150) {
      this.isStart = true;
    }
  }

  checkUnstableFrequency() {
    const numberOfCurrentBits = this.countBytesFromFrequencyCounter();
    if (
      this.frequencyBuffer.length === this.counterDivisor &&
      numberOfCurrentBits === this.counterDivisor
    ) {
      const dominant = this.getDominantFrequency();
      if (dominant >= HIGH_FREQUENCY_REFERENCE) {
        this.setBitValue("1");
      }
      if (dominant <= LOW_FREQUENCY_REFERENCE) {
        this.setBitValue("0");
      }
    }
  }
  setCurrentFrequencyLevel(frequency) {
    if (frequency >= HIGH_FREQUENCY_REFERENCE) {
      this.currentFrequency = "HIGH";
    }
    if (frequency <= LOW_FREQUENCY_REFERENCE && frequency >= 500) {
      this.currentFrequency = "LOW";
    }
  }
  checkFrequencyChange(frequency) {
    let freq = null;
    if (frequency >= HIGH_FREQUENCY_REFERENCE) {
      freq = "HIGH";
    }
    if (frequency <= LOW_FREQUENCY_REFERENCE && frequency >= 500) {
      freq = "LOW";
    }
    if (this.currentFrequency != freq) return true;
    return false;
  }

  calculateChunkSize(sampleRate, duration) {
    return sampleRate / (1000 / duration);
  }

  calculateFrequency(buffer) {
    const real = new Array(this.chunkSize).fill(0);
    const window = new Array(this.chunkSize).fill(0).map((_, i) => {
      return (
        0.42 -
        0.5 * Math.cos((2 * Math.PI * i) / (this.chunkSize - 1)) +
        0.08 * Math.cos((4 * Math.PI * i) / (this.chunkSize - 1))
      );
    });

    for (let i = 0; i < this.chunkSize; i++) {
      real[i] = buffer[i] * window[i];
    }

    const spectrum = new Array(this.chunkSize / 2).fill(0);
    for (let k = 0; k < this.chunkSize / 2; k++) {
      let sumReal = 0,
        sumImag = 0;
      for (let n = 0; n < this.chunkSize; n++) {
        const angle = (2 * Math.PI * k * n) / this.chunkSize;
        sumReal += real[n] * Math.cos(angle);
        sumImag += real[n] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
    }
    // console.log(spectrum);
    let dominantFrequencyIndex = spectrum.indexOf(Math.max(...spectrum));
    // console.log(dominantFrequencyIndex);
    let dominantFrequency =
      dominantFrequencyIndex * (this.sampleRate / this.chunkSize);
    return dominantFrequency;
  }

  countBytesFromFrequencyCounter() {
    if (this.frequencyCounter >= this.counterDivisor) {
      return Math.floor(this.frequencyCounter / this.counterDivisor);
    } else {
      if (this.frequencyCounter >= 3) {
        return 1;
      }
    }
  }

  getDominantFrequency() {
    {
      const count = {};
      let mostFrequentFrequency;
      let maxCount = 0;
      this.frequencyBuffer.forEach((number) => {
        count[number] = (count[number] || 0) + 1;
        if (count[number] > maxCount) {
          mostFrequentFrequency = number;
          maxCount = count[number];
        }
      });
      return mostFrequentFrequency;
    }
  }

  setBitValue(value) {
    if (this.isHeaderChecking && value === "1") {
      this.isHeaderChecking = false;
      this.tempByteHolder = this.tempByteHolder.concat(value);
      this.counter = this.counter + 1;
      this.frequencyBuffer = [];
      return;
    }
    if (!this.isHeaderChecking) {
      if (this.counter > BAUDOT_BYTE_LENGTH) {
        const baudotCode = this.extractBaudotBit(this.tempByteHolder);
        this.findLetter(baudotCode);
        this.tempByteHolder = value;
        this.counter = 1;
        this.frequencyBuffer = [this.currentFrequency];
      } else {
        this.tempByteHolder = this.tempByteHolder.concat(value);
        this.counter = this.counter + 1;
        this.frequencyBuffer = [];
      }
    }
  }

  proccessStoredFrequency() {
    const numberOfCurrentBits = this.countBytesFromFrequencyCounter();
    for (let i = 0; i < numberOfCurrentBits; i++) {
      if (this.currentFrequency === "HIGH") {
        this.setBitValue("1");
      } else if (this.currentFrequency === "LOW") {
        this.setBitValue("0");
      } else {
        console.log(`Frequency ${this.currentFrequency} is not supported`);
      }
    }
  }

  extractBaudotBit(input) {
    const range = input.substring(1, 6);
    const reversedRange = range.split("").reverse().join("");
    const reversedBytes = reversedRange
      .replace(/0/g, "x")
      .replace(/1/g, "0")
      .replace(/x/g, "1");

    return reversedBytes;
  }

  findLetter(baudotCode) {
    if (this.map.hasOwnProperty(baudotCode)) {
      //   console.log(this.map[baudotCode]);
      this.push(this.map[baudotCode]);
    } else {
      if (baudotCode === "11111") {
        this.map = JSON.parse(
          fs.readFileSync(`./codes/${this.ttyCode}/letter.json`)
        );
      } else if (baudotCode === "11011") {
        this.map = JSON.parse(
          fs.readFileSync(`./codes/${this.ttyCode}/figure.json`)
        );
      } else {
        console.log("Not found in mapping", baudotCode);
      }
    }
  }
}

module.exports = Baudot;
