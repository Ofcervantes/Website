#!/bin/sh
set -eu

repository_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
source_file="$repository_dir/resume/Oswin_Cervantes_Resume.tex"
build_dir="$repository_dir/tmp/pdfs/resume_build"
output_dir="$repository_dir/output/pdf"
output_file="$output_dir/Oswin_Cervantes_Resume.pdf"

mkdir -p "$build_dir" "$output_dir"
pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$build_dir" "$source_file"
pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$build_dir" "$source_file"
cp "$build_dir/Oswin_Cervantes_Resume.pdf" "$output_file"

printf 'Built local resume PDF at %s\n' "$output_file"
