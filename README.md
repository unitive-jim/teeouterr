# teeouterr
`teeouterr`: Execute a child process, merging stdout and stderr to a file, and optionally to the console output

`teeouterr` is a tiny app similar in concept to unix `tee`, with a minor twist. Rather than receiving its
input through `stdin`, it runs a child process. Both the `stdout` and the `stderr` of the child process are
merged together and written to specified file. The merged stream may optionally be sent to console output.

Typically the child process will not require input via `stdin`, but `teeouterr` arranges to pipe it's `stdin`
to the child process for those that do.

Installing `teeouterr` installs two scripts, named `teeouterr` and `mergeouterr`. `teeouterr` writes the merged
child stream to both the filePath and to stdout. `mergeouterr` only writes to the file.

## Install

    $ npm install -g teeouterr

## Usage:

    $ teeouterr <filePath> <childExe> [...childArgs]
    $ mergeouterr <filePath> <childExe> [...childArgs]

## Example

    $ teeouterr make.log make MyApp
