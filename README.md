# generate-context

CLI tool to concatenate contents of multiple files with filename headers.

## Usage

```bash
./generate-context [options] [paths...]
```

## Options

- `--include-binary` - Include binary files in the output (not recommended)
- `--exclude-binary` - Exclude binary files from the output (default behavior)
- `--help` - Show help message
- `--version` - Show version

## Examples

```bash
# Concatenate specific files
./generate-context src/main.py src/utils.py

# Use glob patterns
./generate-context "src/**/*.ts"

# Process entire directory
./generate-context src/

# Include binary files
./generate-context --include-binary assets/
```
