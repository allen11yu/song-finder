# Simple Song Finder

This web application integrates APIs from the Rapid API and [lamejs](https://github.com/zhuker/lamejs) to recognize songs from recorded samples within 10 seconds.

## Demo

Below is an example of recognizing the song *Blueberry Fago* by *Lil Mosey*.

https://user-images.githubusercontent.com/64717587/129461109-58184421-ef1a-48f1-bc5c-ec0277046e15.mp4

## Usage

Make sure to subscribe to the following APIs:

[Music Identify API by Eipiai](https://rapidapi.com/eipiai-eipiai-default/api/music-identify/)

[Shazam API by Api Dojo](https://rapidapi.com/apidojo/api/shazam/)

Then, copy the header parameters and paste it in the `api_keys.js` file.

Finally, update the script source in the `index.html` from `exclude/api_key.js` to `api_key.js`.
