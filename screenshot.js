const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');
const GIFEncoder = require('gif-encoder');
const fs = require('fs');
const getPixels = require('get-pixels');

exports.generateShip = async (id) => {
  const encoder = new GIFEncoder(200, 300);
  const workDir = './temp/';
  let file = fs.createWriteStream(`ss13k-${id}.gif`);
  const browser = await chromium.puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  };

  // Setup gif encoder parameters
  encoder.setFrameRate(60);
  encoder.pipe(file);
  encoder.setQuality(35);
  encoder.setDelay(5);
  encoder.writeHeader();
  encoder.setRepeat(0);

  // Helper functions declaration
  function addToGif(images, counter = 0, callback) {
    getPixels(images[counter], function (err, pixels) {

      encoder.addFrame(pixels.data);
      encoder.read();
      if (counter === images.length - 1) {
        encoder.finish();
        cleanUp(images, function (err) {
          if (err) {
            console.log(err);
          } else {
            fs.rmdirSync(workDir);
            console.log('Gif created!');
            callback();
            //process.exit(0);
          }
        });

      } else {
        addToGif(images, ++counter, callback);
      }
    });
  };

  function cleanUp(listOfPNGs, callback) {
    let i = listOfPNGs.length;
    listOfPNGs.forEach(function (filepath) {
      fs.unlink(filepath, function (err) {
        i--;
        if (err) {
          callback(err);
          return;
        } else if (i <= 0) {
          callback(null);
        }
      });
    });
  };


  await page.setViewport({ width: 400, height: 600 });
  //await page.goto(`http://localhost:8080/?id=${id}`);
  await page.goto(`http://localhost:8080/?id=${id}`);

  for (let i = 0; i < 30; i++) {
    await page.screenshot({ path: workDir + i + ".png", clip: {x:100, y:150, width: 200, height: 300 } });
  }
  await page.click('.card');
  for (let i = 30; i < 40; i++) {
    await page.screenshot({ path: workDir + i + ".png", clip: {x:100, y:150, width: 200, height: 300 } });
  }
    
  await browser.close();

  let listOfPNGs = fs.readdirSync(workDir)
    .map(a => a.substr(0, a.length - 4) + '')
    .sort(function (a, b) { return a - b })
    .map(a => workDir + a.substr(0, a.length) + '.png');

  return new Promise((resolve)=>{
    addToGif(listOfPNGs, 0, resolve);
  });
};
