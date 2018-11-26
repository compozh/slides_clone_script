# Description
 This script will be useful for automatically copying slides from a presentation to another presentation with all dependencies.

# Criteria for use:
1. It is solution for `node.js` command-line interfaces.
2. Use only for presentations built on `Cobalt Engine`.
3. Presentation root must contain file `structure.json`.
4. Script is developed on node.js version `8.11.3` and npm `6.4.1`.

# Installation

1. Clone project from git repository
2. Install modules by running `npm i`.
3. For local use run `npm link`.

# Usage
In folder with original presentation, run script specifying the command line `slide-clone`.
You will get a list of slides available for copying and a request for entering slide names.
Entering names must be separated by a space. Titles can be copied and pasted directly from the list.
After that, the program will check the listed names for compliance. If at least one slide is available,
the script will offer to enter the destination path for copying. The path must be `absolute`. if the
entered path passes validation, then the specified slides will be automatically copied with all dependencies
(kpi, models, images, screens, styles, thumbs, localizations, controllers, templates).  
Script results will be displayed as logs.

# Command-specific options
Уou can use additional options / keys when running the script:  

Options:  
`-a` or `--all` - clone all slides  
`-v` or `--version` - output the version number  
`-h` or `--help` - output usage information  

Short flags may be passed as a single arg, for example -hva is equivalent to -h -v -a.  
When either of these options is present, the command prints the version number and exits.
