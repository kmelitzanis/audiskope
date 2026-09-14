#!/usr/bin/env bash
# Build unmodified official FFmpeg using only built-in audio components.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=8.0.1
SHA256=05ee0b03119b45c0bdb4df654b96802e909e0a752f72e4fe3794f487229e5a41
case "$(uname -s)" in
  Darwin) PLATFORM=darwin; CC=clang ;;
  Linux) PLATFORM=linux; CC=gcc ;;
  MINGW*|MSYS*) PLATFORM=win32; CC=gcc ;;
  *) echo 'Unsupported build platform'; exit 1 ;;
esac
case "$(uname -m)" in arm64|aarch64) ARCH=arm64 ;; x86_64|amd64) ARCH=x64 ;; *) exit 1 ;; esac
TARGET="$PLATFORM-$ARCH"
WORK="$ROOT/.native-build/$TARGET"
OUT="$ROOT/native/$TARGET"
mkdir -p "$WORK" "$OUT"
ARCHIVE="$WORK/ffmpeg-$VERSION.tar.xz"
if [ ! -f "$ARCHIVE" ]; then curl --fail --location --retry 3 "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz" -o "$ARCHIVE"; fi
if command -v sha256sum >/dev/null; then HASH="$(sha256sum "$ARCHIVE" | cut -d' ' -f1)"; else HASH="$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1)"; fi
[ "$HASH" = "$SHA256" ] || { echo 'FFmpeg source checksum mismatch'; exit 1; }
# Clean build prevents stale configuration/binaries from entering a release.
rm -rf "$WORK/source" "$OUT"
mkdir -p "$WORK/source" "$OUT/compliance"
tar -xf "$ARCHIVE" -C "$WORK/source" --strip-components=1
cd "$WORK/source"
FLAGS=(--disable-autodetect --disable-gpl --disable-nonfree --disable-version3
 --disable-everything --disable-network --disable-doc --disable-debug
 --disable-shared --enable-static --disable-x86asm --disable-inline-asm
 --disable-avdevice --disable-swscale --disable-ffplay
 --enable-ffmpeg --enable-ffprobe --cc="$CC"
 --enable-protocol=file,pipe
 --enable-demuxer=aac,aiff,ape,asf,au,caf,flac,matroska,mov,mp3,ogg,wav,wv
 --enable-decoder=aac,aac_fixed,aac_latm,ac3,alac,ape,eac3,flac,mp1,mp1float,mp2,mp2float,mp3,mp3float,opus,vorbis,wavpack,wmalossless,wmapro,wmav1,wmav2,wmavoice
 --enable-decoder=pcm_*,adpcm_*
 --enable-parser=aac,aac_latm,ac3,flac,mpegaudio,opus,vorbis
 --enable-encoder=pcm_f32le,pcm_s16le,pcm_s24be,flac,alac,aac
 --enable-muxer=pcm_f32le,wav,aiff,flac,ipod,adts
 --enable-filter=aresample,aformat,anull)
if [ "$PLATFORM" = win32 ]; then FLAGS+=(--target-os=mingw32 --extra-ldflags=-static); fi
printf '%s\n' "${FLAGS[@]}" > "$OUT/compliance/configure-flags.txt"
./configure "${FLAGS[@]}" > "$OUT/compliance/configure-output.txt" 2>&1
JOBS="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)"
make -j"$JOBS" > "$WORK/build.log" 2>&1 || { tail -60 "$WORK/build.log"; exit 1; }
EXT=''; [ "$PLATFORM" != win32 ] || EXT=.exe
cp "ffmpeg$EXT" "ffprobe$EXT" "$OUT/"
cp "$ARCHIVE" LICENSE.md COPYING.LGPLv2.1 "$OUT/compliance/"
cp ffbuild/config.log "$OUT/compliance/config.log"
cp "$ROOT/scripts/build-audio.sh" "$OUT/compliance/build-audio.sh"
printf 'Unmodified official FFmpeg %s\nSource SHA-256: %s\nTarget: %s\n' "$VERSION" "$SHA256" "$TARGET" > "$OUT/compliance/BUILD.txt"
"$CC" --version >> "$OUT/compliance/BUILD.txt"
for TOOL in ffmpeg ffprobe; do
 "$OUT/$TOOL$EXT" -L > "$OUT/compliance/$TOOL-license.txt" 2>&1
 "$OUT/$TOOL$EXT" -version > "$OUT/compliance/$TOOL-version.txt" 2>&1
 if grep -Eq -- '--enable-(nonfree|gpl|version3)|not legally redistributable' "$OUT/compliance/$TOOL-version.txt" "$OUT/compliance/$TOOL-license.txt"; then echo 'Unexpected licensing configuration'; exit 1; fi
 grep -q 'Lesser General Public' "$OUT/compliance/$TOOL-license.txt"
done
echo "Built LGPL audio tools: $OUT"
