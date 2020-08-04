# Bitwig Enhancement Suite

> In Early Development

BES runs in the background and **adds helpful keyboard shortcuts and features** to Bitwig Studio.

It is currently **Mac only**, but is built with cross-platform support in mind.

- [Features](#features)
- [Setup](#setup)
- [How It Works](#how-it-works)
- [Contributing](#contributing)

# Features

### Global

- [x] Track Search (Ctrl+Space)
- [x] Track Back/Forward (Ctrl+'-'/Shift+'-')

### Automation

- [ ] Type value for selected points (Command+Enter)

### Modulation

- [ ] Type modulation amount for first modulation (Command+Enter)

# Setup

1. Download the latest version of the app from the releases tab and copy it to your Applications folder. 

2. Open BES, and enable our custom controller script from Bitwig Settings (it will be copied to your "Controller Scripts" folder automatically on startup).

# How It Works

BES in an electron application that uses C++ extensions to listen for global keypresses and communicates with Bitwig via its controller API. For some functions, plain mouse/keyboard automation is used, using native APIs for 

# Contributing

Standard fork and pull request is fine. Please see the separate CONTRIBUTING.md for help with contributing, development setup.