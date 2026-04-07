#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMIC_DIR="$ROOT_DIR/public/comic-film"
HORROR_DIR="$ROOT_DIR/public/horror-film"

compress_video() {
  local input="$1"
  local fps="$2"
  local width="$3"
  local crf="$4"
  local maxrate="$5"
  local bufsize="$6"
  local audio_bitrate="$7"
  local tmp_output

  tmp_output="$(mktemp --suffix=.mp4 "${input%.*}.tmp.XXXXXX")"
  echo "Optimizing $(basename "$input")"

  ffmpeg -y -hide_banner -loglevel error -i "$input" \
    -map_metadata -1 -map_chapters -1 \
    -c:v libx264 -preset slow -profile:v high -level 4.0 \
    -pix_fmt yuv420p -movflags +faststart \
    -vf "fps=${fps},scale=${width}:-2:flags=lanczos" \
    -crf "$crf" -maxrate "$maxrate" -bufsize "$bufsize" \
    -c:a aac -b:a "$audio_bitrate" \
    "$tmp_output"

  if [[ ! -s "$tmp_output" ]]; then
    echo "ffmpeg did not produce output for $input" >&2
    rm -f "$tmp_output"
    return 1
  fi

  mv -f "$tmp_output" "$input"
}

main() {
  shopt -s nullglob

  for file in "$COMIC_DIR"/*.mp4; do
    compress_video "$file" 24 1280 28 1800k 3600k 96k
  done

  for file in "$HORROR_DIR"/*.mp4; do
    compress_video "$file" 30 1280 28 2200k 4400k 128k
  done

  echo "Done."
}

main "$@"
