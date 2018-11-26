const fse = require('fs-extra');
const path = require('path');
const prompts = require('prompts');
const chalk = require('chalk');
const cheerio = require('cheerio');

const pathToPresentation = path.normalize(process.cwd());
const presentationStructure = getPresentationStructure();
const originalSlides = getSlides();
let slidesForClone = [];

function getPresentationStructure () {
  return fse.readJsonSync(path.normalize(`${pathToPresentation}/structure.json`), {throws: false});
}

// questions array
const questions = [
  {
    type: () => slidesForClone.length ? null : 'text',
    name: 'slides',
    message: 'Enter slides id for clone (through space):'
  },
  {
    // if slides not found, directory request not execute
    type: selectedSlides => getSelectedSlides(selectedSlides),
    name: 'directory',
    message: 'Еnter absolute path to destination directory:'
  }
];

function getSelectedSlides (selectedSlides) {
  if (!slidesForClone.length) slidesForClone = checkAvailabilitySlides(selectedSlides, originalSlides);
  return slidesForClone ? 'text' : null;
}

// getting available slides list from original presentation
function getSlides () {
  if (!presentationStructure) {
    return console.log(`  File "structure.json" not found. Run "slides-clone" in presentation folder`);
  }
  return Object.keys(presentationStructure.slides);
}

// slides list output
function printSlidesList () {
  console.log(chalk.yellow(`--\nAvailable slides list:`));
  originalSlides.forEach(slideId => console.log(chalk.cyanBright(` ${slideId}`)));
  console.log(chalk.yellow(`--`));
}

// getting answers for questions from array
async function getAnswers (options) {
  try {
    
    if (options) {
      slidesForClone = originalSlides;
      console.log(chalk.yellow('  All slides selected'));
    }

    let response = await prompts(questions);
    let directory = response.directory;
    
    // if no slides for copy, path not checking
    if (!slidesForClone) return;
    const destinationPath = checkDestinationPath(directory);
    if (!destinationPath) return;
    
    return {
      pathToPresentation,
      slidesForClone,
      destinationPath
    }
  } catch (err) {
    console.error(err)
  }
}

// checking availability input ids slides in original presentation
function checkAvailabilitySlides (selectedSlides, originalSlides) {
  let checkedSlides = [];
  
  if (!selectedSlides) return console.log(chalk.redBright('  Slides not selected'));
  let selectedSlidesArray = selectedSlides.split(' ');
  
  selectedSlidesArray.forEach(slide => {
    if (!~originalSlides.indexOf(slide)) {
      return console.error(chalk.redBright(`  Slide: "${slide}" not found`));
    }
    checkedSlides.push(slide);
  });
  return checkedSlides.length > 0 ? checkedSlides : null;
}

// checking availability input ids slides in original presentation
function checkDestinationPath (destinationPath) {
  if (!destinationPath) {
    return console.log(chalk.redBright('  Path did not enter'));
  }
  if (!fse.pathExistsSync(destinationPath)) {
    return console.log(chalk.redBright('  This path does not exist'));
  }
  if (!path.isAbsolute(destinationPath)) {
    return console.log(chalk.redBright('  This path is not absolute'));
  }
  return destinationPath;
}

// function for create dependencies
function getDependencies (slidesForClone, thisDir) {
  
  if (fse.pathExistsSync(thisDir)) {
    
    let subFoldersOrFiles = fse.readdirSync(thisDir);
    let pathDependencies = {};

    subFoldersOrFiles.forEach(folderOrFile => {
      const relativePath = path.normalize(`${thisDir}/${folderOrFile}`);
      // statSync returns fs.Stats object which provides information about a file
      const stat = fse.statSync(relativePath);
      // stats.isDirectory returns true if the fs.Stats object describes a file system directory
      const currentFileName = checkFileName(folderOrFile, slidesForClone);
      // if this is directory and not a file and name not match with slides for clone - starting scan inside this
      if (!currentFileName && stat.isDirectory()) {
        pathDependencies = Object.assign(pathDependencies, getDependencies(slidesForClone, relativePath))
      }
      // if this is file and name match with slides for clone - adding reference in dependence
      if (currentFileName) {
        let key = thisDir.split(path.sep).pop();
        // if root equaled "app", it is markup file .html
        if (key === 'app') {
          key = 'html';
          // parsing html for collection of data on specific components
          const templatesAndControllers = getTemplatesAndControllers(thisDir, relativePath, currentFileName);
          for (let dependency in templatesAndControllers) {
            templatesAndControllers[dependency].forEach((pathDependency, index) => {
              pathDependencies[`${currentFileName}: ${dependency}${index + 1}`] = pathDependency;
            })
          }
        }
        pathDependencies[`${currentFileName}: ${key}`] = relativePath;
      }
    });
    return pathDependencies;
  }
}

// checking sub element - is it file or folder
function checkFileName (folderOrFile, slidesForClone) {
  const folderOrFileName = folderOrFile.split('.').shift();
  return slidesForClone.find(slideId => slideId === folderOrFileName);
}

function getTemplatesAndControllers (thisDir, relativePath, currentFileName) {
  const slideHtml = getSlideHtml(relativePath);
  const templates = getTemplates(slideHtml, thisDir);
  const templatesHtml = getTemplateHtml(templates);
  const controllers = getControllers(slideHtml, templatesHtml, currentFileName, thisDir);
  return {
    templates: Object.values(templates),
    controllers: Object.values(controllers)
  }
}

function getSlideHtml (path) {
  return fse.readFileSync(path, 'utf8');
}

function getTemplates (slideHtml, thisDir) {
  // load slide html
  const $ = cheerio.load(slideHtml);
  // find templates
  let foundTemplates = $('rv-template').map((index, element) => element.attribs['name']).get();
  // common templates list
  const commonTemplates = ['layout', 'common-components'];
  // templates list filtering without common templates
  foundTemplates = foundTemplates.filter(template => !~commonTemplates.indexOf(template));
  // getting templates list with paths through object
  const templatesObj = {};
  foundTemplates.forEach(template => {
    templatesObj[template] = path.normalize(`${thisDir}/templates/${template}.html`);
  });
  return templatesObj;
}

function getTemplateHtml(templates) {
  let templatesHtml ='';
  for (let template in templates) templatesHtml += fse.readFileSync(templates[template], 'utf8');
  return templatesHtml;
}

function getControllers (slideHtml, templatesHtml, currentFileName, thisDir) {
  const html = slideHtml + templatesHtml;
  const $ = cheerio.load(html);
  let foundControllers = $('[rv-controller]').map((index, element) => element.attribs['rv-controller']).get();
  // exclude controllers whose name matches the name of the slide
  foundControllers = foundControllers.filter(controller => controller !== currentFileName);
  // check other controllers
  const controllersObj = {};
  if (foundControllers.length) {
    foundControllers.forEach(controller => {
      controllersObj[controller] = path.normalize(`${thisDir}/controllers/${controller}.js`);
    });
  }
  return controllersObj;
}

// main clone method
async function getClone (dependencies, options) {
  if (!dependencies) return console.log(`  ${chalk.redBright('slide(s) dependencies not found')}`);

  let countOk = 0, fails = [];
  let log = []; // array for logging
  for (let slideId in dependencies) {
    
    let from = path.normalize(`${pathToPresentation}/${dependencies[slideId]}`);
    let to = path.normalize(`${options.destinationPath}/${dependencies[slideId]}`);
    
    if (!fse.pathExistsSync(from)) {
      fails.push(dependencies[slideId]);
      continue;
    }
    
    await fse.copy(from, to)
    .then(() => log.push(slideId)) // writing logs
    .then(() => countOk++)
    .catch(err => {
      console.error(err.message);
      fails++;
    })
  }
  getLogging(log, countOk, fails);
}

function getLogging (logArray, countOk, fails) {
  // alphabetical log output
  console.log(chalk.yellow(`--`));
  logArray.sort().forEach(log => {
    // separate slide/component output
    const slideId = log.split(' ').shift();
    const component = log.split(' ').pop();
    console.log(chalk.cyanBright(`  ${slideId}`), `${component} - ${chalk.greenBright('cloned')}`);
  });
  console.log(`\nSummary: ${chalk.greenBright('success')} - ${countOk}, ${chalk.redBright('passed')} - ${fails.length}\n`);
  fails.forEach(fail => console.log(`${chalk.yellow('Skipped to copy')} - ${fail}`));
}

module.exports = {
  printSlidesList,
  getAnswers,
  getDependencies,
  getClone
};
