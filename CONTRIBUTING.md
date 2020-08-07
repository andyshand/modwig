# Setup

## App Setup

1. Run `npm i` to install dependencies
2. Open 3 terminals
    - `npm run dev` to run Webpack Dev Server for renderer process
    - `npm run watch` to autocompile Typescript for main process
    - `npm run start` to start Electron (and restart on changes)

## Controller Script Setup

Open another two terminals (🙈), one to compile the controller script, and another to copy to your "Controller Scripts" folder upon compilation. These currently assume that your folder exists under `~/Documents/Bitwig Studio/Controller Scripts`.

1. `npm run watch:controller` 
1. `npm run nodemon:controller` 

# Coding Guidelines

In no specific order:

1. We want to split up code by feature, you'll likely want two folders, one in `src/main` and one under `src/render` to handle target the main/renderer process respectively. In the controller script, although it is currently limited to one file, features should be split across several 'controller' classes.

2. Raw CSS should mostly be avoided, instead opting to use Styled Components, leading to more modulator code that interfaces cleanly with JS.

3. Err towards keeping time consuming code in Electron as opposed to the controller script - we want to keep Bitwig running as smoothly as possible.