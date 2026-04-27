# generate-context

CLI tool to concatenate contents of multiple files with filename headers.

## Usage

```bash
./generate-context.sh [options] [paths...]
```

## Options

- `--include-binary` - Include binary files in the output (not recommended)
- `--exclude-binary` - Exclude binary files from the output (default behavior)
- `--help` - Show help message
- `--version` - Show version

## Examples

```bash
# Concatenate specific files
./generate-context.sh src/main.py src/utils.py

# Use glob patterns
./generate-context.sh "src/**/*.ts"

# Process entire directory
./generate-context.sh src/

# Include binary files
./generate-context.sh --include-binary assets/
```
