#!/usr/bin/env node
const program = require('commander');
const { printSlidesList,
        getAnswers,
        getDependencies,
        getClone } = require('./utils/actions');

// allows the use of additional parameters
// such as -h for help call and -v for displayed version
program
  .version('current version 1.0.0', '-v, --version')
  .option('-a, --all', 'clone all slides')
  .description('User management system')
  .parse(process.argv);

// displaying available slides list from original presentation
printSlidesList();

// Immediately Invoked Function Expression (IIFE)
// asynchronous getting answers for questions in command line
(async () => {
  // object for write input parameters
  const options = await getAnswers(program.all);
  if (!options) return;
  
  // object for dependency paths collection
  const dependencies = getDependencies(options.slidesForClone, 'app');
  // copying data to destination
  getClone(dependencies, options);
  
})();
