# teeouterr
`teeouterr`: Execute a child process, merging stdout and stderr to a file, passing through stderr to stdout

`teeouterr` is a tiny app similar in concept to unix `tee`, with a minor twist. Rather than receiving its
input through `stdin`, it runs a child process. Both the `stdout` and the `stderr` of the child proces are
merged together and written to specified file. Meanwhile, the `stderr` of the child process is piped
to the `stdout` of the parent process (i.e. `teeouterr`).

Typically the child process will not require input via `stdin`, but `teeouterr` arranges to pipe it's `stdin`
to the child process for those that do.

## Install

    $ npm install -g teeouterr

## Usage:

    $ teeouterr <filePath> <childExe> [...childArgs]

## Example

    $ teeouterr make.log make MyApp
