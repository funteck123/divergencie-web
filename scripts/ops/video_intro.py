#!/usr/bin/env python3
"""Read the first seconds of Drive videos and write what the teacher says (TKT-0358: name each recording by its own intro).

ffmpeg reads the Drive file over HTTP with the OAuth header and stops after SECONDS of audio, so only the start of each video is fetched, not the whole file.
faster-whisper (CPU, "base" model) turns that audio into text. Results go to a JSON file keyed by Drive id; a rerun skips ids already in it.

  python3 scripts/ops/video_intro.py <drive id> [<drive id> ...] [--out data/youtube/intros.json] [--seconds 120]

Needs GOOGLE_OAUTH_* in the environment (Drive scope) and ffmpeg on PATH.
"""
import json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request, wave
import numpy as np

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))


def token():
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", urllib.parse.urlencode(
        {"client_id": CID, "client_secret": CSEC, "refresh_token": RT, "grant_type": "refresh_token"}).encode()), timeout=60))
    return r["access_token"]


def audio_clip(file_id, seconds, path):
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&supportsAllDrives=true"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-headers", f"Authorization: Bearer {token()}\r\n", "-i", url, "-t", str(seconds), "-vn", "-ac", "1", "-ar", "16000", path]
    subprocess.run(cmd, check=True, timeout=600)


def main():
    args = sys.argv[1:]
    out, seconds = "data/youtube/intros.json", 120
    if "--out" in args:
        i = args.index("--out"); out = args[i + 1]; del args[i:i + 2]
    if "--seconds" in args:
        i = args.index("--seconds"); seconds = int(args[i + 1]); del args[i:i + 2]
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    done = json.load(open(out)) if os.path.exists(out) else {}
    for fid in args:
        if fid in done:
            continue
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, "a.wav")
            t0 = time.time()
            try:
                audio_clip(fid, seconds, wav)
                with wave.open(wav) as w:  # read the 16 kHz mono clip ourselves; faster-whisper's own file reader needs a newer PyAV
                    samples = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
                segs, info = model.transcribe(samples, beam_size=1, vad_filter=True)
                text = " ".join(s.text.strip() for s in segs)
            except Exception as e:
                print("FAILED", fid, str(e)[:200]); continue
        done[fid] = {"language": info.language, "text": text}
        json.dump(done, open(out, "w"), indent=1, ensure_ascii=False)
        print(fid, f"{time.time() - t0:.0f}s", text[:160].replace("\n", " "), flush=True)


if __name__ == "__main__":
    main()
