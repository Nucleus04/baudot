
import json
import base64
import numpy as np
import wave
import io


def compress_samples(samples, compression_factor):
    new_length = int(len(samples) / compression_factor)
    compressed_samples = np.zeros(new_length, dtype=np.float16)
    for i in range(new_length):
        compressed_samples[i] = np.mean(samples[i * compression_factor : (i + 1) * compression_factor])
    return compressed_samples


def generate_tones_from_binary_string( binary_string, duration_per_bit, silence_duration=0.15, volume=0.5, compression_factor=1):
    sample_rate = 8000  
    num_channels = 1 
    sample_width = 2  

    tone_samples = []

    silence_samples = np.zeros(int(sample_rate * silence_duration), dtype=np.float16)
    tone_samples.extend(silence_samples)

    for bit in binary_string:
        if bit == '1':
            frequency = 1800
        elif bit == '0':
            frequency = 1400
        else:
            raise ValueError("Input string should contain only '0' or '1'")

        t = np.linspace(0, duration_per_bit, int(sample_rate * duration_per_bit), endpoint=False)
        samples = (np.sin(2 * np.pi * frequency * t)).astype(np.float16)
        samples *= 32767.0 * volume
        compressed_samples = compress_samples(samples, compression_factor)

        tone_samples.extend(compressed_samples)

    raw_data = np.array(tone_samples, dtype=np.int16).tobytes()
    
   

    wav_file = io.BytesIO()
    with wave.open(wav_file, 'wb') as wf:
        wf.setnchannels(num_channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(raw_data)

    wav_file.seek(0)
    wav_data = wav_file.read()

    wav_file.close()
    encoded_wav_data = base64.b64encode(wav_data).decode("utf-8")
    print(encoded_wav_data)

if __name__ == "__main__":
    import sys
    text = sys.argv[1]
    generate_tones_from_binary_string(text, duration_per_bit=0.020, silence_duration=0.150, volume=0.2)

    