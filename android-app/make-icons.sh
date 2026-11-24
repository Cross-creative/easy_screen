#!/bin/bash
set -e
SRC="$1"
RES="android/app/src/main/res"
if [ ! -f "$SRC" ]; then
  echo "Ícone não encontrado: $SRC"
  exit 1
fi
BG="#121316"
ALPHA=$(convert "$SRC" -format '%[fx:p{4,4}.a]' info:)
if awk "BEGIN { exit !($ALPHA > 0.9) }"; then
  HEX=$(convert "$SRC" -depth 8 -format '%[hex:p{4,4}]' info:)
  BG="#${HEX:0:6}"
fi
echo "Cor de fundo do ícone: $BG"
for entry in "mdpi 48 108" "hdpi 72 162" "xhdpi 96 216" "xxhdpi 144 324" "xxxhdpi 192 432"; do
  set -- $entry
  d=$1
  s=$2
  f=$3
  inner=$((f * 61 / 100))
  half=$((s / 2))
  convert "$SRC" -resize "${s}x${s}!" "$RES/mipmap-$d/ic_launcher.png"
  convert "$SRC" -resize "${s}x${s}!" \( -size "${s}x${s}" xc:none -fill white -draw "circle $half,$half $half,0" \) -compose DstIn -composite "$RES/mipmap-$d/ic_launcher_round.png"
  convert "$SRC" -resize "${inner}x${inner}" -background none -gravity center -extent "${f}x${f}" "$RES/mipmap-$d/ic_launcher_foreground.png"
done
sed -i "s/#[0-9A-Fa-f]\{6\}/$BG/" "$RES/values/ic_launcher_background.xml"
echo "Ícones gerados"
